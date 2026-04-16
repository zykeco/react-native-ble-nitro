import Foundation
import CoreBluetooth
import NitroModules
/**
 * iOS implementation of the BLE Nitro Manager
 * Implements the HybridNativeBleNitroSpec protocol for Core Bluetooth operations
 */
public class BleNitroBleManager: HybridNativeBleNitroSpec {

    // MARK: - Static Properties
    internal static var globalRestoreStateCallback: (([BLEDevice]) -> Void)?
    
    // MARK: - Private Properties
    private var centralManager: CBCentralManager!
    private var connectedPeripherals: [String: CBPeripheral] = [:]
    private var discoveredPeripherals: [String: CBPeripheral] = [:]
    private var peripheralDelegates: [String: BlePeripheralDelegate] = [:]
    private var intentionalDisconnections: Set<String> = []
    private var scanCallback: ((BLEDevice) -> Void)?
    private var stateChangeCallback: ((BLEState) -> Void)?
    private var isCurrentlyScanning = false
    private var currentScanFilter: ScanFilter?
    private var centralManagerDelegate: BleCentralManagerDelegate!
    private let lazyInitEnabled: Bool
    private var isCentralManagerInitialized = false

    // MARK: - Peripheral Mode Properties
    private var peripheralManager: CBPeripheralManager!
    private var gattServerDelegate: BleGattServerDelegate!
    private var isCurrentlyAdvertising = false
    private var addedServices: [String: CBMutableService] = [:]
    /// Cache for characteristic values with 60s TTL. Key format: "serviceUUID:characteristicUUID"
    private var characteristicValueCache: [String: (data: Data, timestamp: Date)] = [:]
    private var readRequestCallback: ((String, String, Double, Double) -> Void)?
    private var writeRequestCallback: ((String, String, Double, ArrayBuffer, Bool) -> Void)?
    private var peripheralStateCallback: ((BLEState) -> Void)?
    /// Pending read requests keyed by requestId
    private var pendingReadRequests: [Double: CBATTRequest] = [:]
    /// Pending write requests keyed by requestId
    private var pendingWriteRequests: [Double: [CBATTRequest]] = [:]
    private var nextRequestId: Double = 1
    /// Subscribed centrals keyed by characteristic UUID string
    private var subscribedCentrals: [String: [CBCentral]] = [:]
    
    // MARK: - Restore State Properties
    internal var restoreStateCallback: (([BLEDevice]) -> Void)?

    // MARK: - Public Properties (from spec)
    public var restoreStateIdentifier: String? = nil

    // MARK: - Initialization
    public init(restoreStateIdentifier: String? = nil, restoreStateCallback: (([BLEDevice]) -> Void)? = nil) {
        self.restoreStateIdentifier = restoreStateIdentifier
        self.restoreStateCallback = restoreStateCallback
        self.lazyInitEnabled = Bundle.main.object(forInfoDictionaryKey: "BLENitroLazyInit") as? Bool ?? false
        super.init()
        if lazyInitEnabled && restoreStateIdentifier != nil {
            print("[BleNitro] Warning: lazyInit is enabled with restoreStateIdentifier. State restoration will be delayed until first BLE API call.")
        }
        if !lazyInitEnabled {
            setupCentralManager()
        }
    }
    
    private func setupCentralManager() {
        centralManagerDelegate = BleCentralManagerDelegate(manager: self)

        // Create options dictionary for central manager with restore identifier if set
        var options: [String: Any] = [:]
        print("Restore Identifier: \(String(describing: restoreStateIdentifier))")
        if let identifier = restoreStateIdentifier {
            options[CBCentralManagerOptionRestoreIdentifierKey] = identifier
        }

        centralManager = CBCentralManager(delegate: centralManagerDelegate, queue: DispatchQueue.main, options: options.isEmpty ? nil : options)

        // Initialize peripheral manager for GATT server / advertising
        gattServerDelegate = BleGattServerDelegate(manager: self)
        peripheralManager = CBPeripheralManager(delegate: gattServerDelegate, queue: DispatchQueue.main)

        isCentralManagerInitialized = true
    }

    // MARK: - Thread-Safe Lazy Initialization
    private func ensureCentralManager() {
        guard !isCentralManagerInitialized else { return }
        if Thread.isMainThread {
            setupCentralManager()
        } else {
            DispatchQueue.main.sync {
                guard !self.isCentralManagerInitialized else { return }
                self.setupCentralManager()
            }
        }
    }


    // MARK: - Trigger iOS Lazy Initialization
    public func iosLazyInit() throws {
        ensureCentralManager()
    }

    // MARK: - State Management
    public func state() throws -> BLEState {
        ensureCentralManager()
        let bleState = mapCBManagerStateToBLEState(centralManager.state)
        return bleState
    }
    
    public func requestBluetoothEnable(callback: @escaping (Bool, String) -> Void) throws {
        // iOS doesn't allow programmatic Bluetooth enabling
        // We can only check the current state
        callback(false, "Not supported")
    }
    
    public func subscribeToStateChange(
        stateCallback: @escaping (BLEState) -> Void
    ) throws -> OperationResult {
        ensureCentralManager()
        self.stateChangeCallback = stateCallback
        return OperationResult(success: true, error: nil)
    }

    public func unsubscribeFromStateChange() throws -> OperationResult {
        self.stateChangeCallback = nil
        return OperationResult(success: true, error: nil)
    }
    
    // MARK: - Restore State Management
    public func setRestoreStateCallback(callback: @escaping ([BLEDevice]) -> Void) throws {
        // Set both static and instance variables
        BleNitroBleManager.globalRestoreStateCallback = callback
        self.restoreStateCallback = callback
    }
    
    // MARK: - Scanning Operations
    public func startScan(filter: ScanFilter, callback: @escaping (Variant_NullType_BLEDevice?, Variant_NullType_String?) -> Void) throws {
        ensureCentralManager()
        guard centralManager.state == .poweredOn else {
            throw NSError(domain: "BleNitroError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Bluetooth is not powered on"
            ])
        }

        func scanCallbackWrapper(device: BLEDevice) {
            callback(.second(device), nil)
        }
        self.scanCallback = scanCallbackWrapper
        self.currentScanFilter = filter
        self.isCurrentlyScanning = true
        
        // Convert service UUIDs to CBUUIDs
        let serviceUUIDs = filter.serviceUUIDs.isEmpty ? nil : filter.serviceUUIDs.compactMap { CBUUID(string: $0) }
        
        // Configure scan options
        var options: [String: Any] = [:]
        if filter.allowDuplicates {
            options[CBCentralManagerScanOptionAllowDuplicatesKey] = true
        }
        
        centralManager.scanForPeripherals(withServices: serviceUUIDs, options: options)
    }
    
    public func stopScan() throws -> Bool {
        ensureCentralManager()
        centralManager.stopScan()
        isCurrentlyScanning = false
        scanCallback = nil
        currentScanFilter = nil
        // Keep discovered peripherals for potential connections
        return true
    }
    
    public func isScanning() throws -> Bool {
        return isCurrentlyScanning
    }
    
    // MARK: - Device Discovery
    public func getConnectedDevices(services: [String]) throws -> [BLEDevice] {
        ensureCentralManager()
        var connectedDevices: [BLEDevice] = []
        
        // First check our tracked connected peripherals
        for (deviceId, peripheral) in connectedPeripherals {
            let device = BLEDevice(
                id: deviceId,
                name: peripheral.name ?? "Unknown Device",
                rssi: 0, // RSSI not available for connected devices without explicit read
                manufacturerData: ManufacturerData(companyIdentifiers: []), // Not available for connected devices
                serviceUUIDs: peripheral.services?.map { $0.uuid.uuidString } ?? [],
                isConnectable: true, // Already connected, so it was connectable
                isConnected: true
            )
            connectedDevices.append(device)
        }
        
        // Check previously discovered peripherals to see if any are still connected
        for (deviceId, peripheral) in discoveredPeripherals {
            // Skip if we already know it's connected
            if connectedPeripherals.keys.contains(deviceId) {
                continue
            }
            
            // Check if this peripheral is actually connected by checking its state
            if peripheral.state == .connected {
                let device = BLEDevice(
                    id: deviceId,
                    name: peripheral.name ?? "Unknown Device",
                    rssi: 0,
                    manufacturerData: ManufacturerData(companyIdentifiers: []),
                    serviceUUIDs: peripheral.services?.map { $0.uuid.uuidString } ?? [],
                    isConnectable: true,
                    isConnected: true
                )
                connectedDevices.append(device)
                
                // Add to our tracking dictionary
                connectedPeripherals[deviceId] = peripheral
            }
        }
        
        // Query system connected peripherals with specified services
        let withServices: [CBUUID] = services.compactMap { CBUUID(string: $0) }
        
        for service in withServices {
            let peripherals = centralManager.retrieveConnectedPeripherals(withServices: [service])
            for peripheral in peripherals {
                let deviceId = peripheral.identifier.uuidString
                
                // Only add if we don't already have it in our list
                if !connectedPeripherals.keys.contains(deviceId) {
                    let device = BLEDevice(
                        id: deviceId,
                        name: peripheral.name ?? "Unknown Device",
                        rssi: 0,
                        manufacturerData: ManufacturerData(companyIdentifiers: []),
                        serviceUUIDs: peripheral.services?.map { $0.uuid.uuidString } ?? [],
                        isConnectable: true,
                        isConnected: true
                    )
                    connectedDevices.append(device)
                    
                    // Add to our tracking dictionaries for future use
                    discoveredPeripherals[deviceId] = peripheral
                    connectedPeripherals[deviceId] = peripheral
                }
            }
        }
        
        return connectedDevices
    }
    
    // MARK: - Connection Management
    public func connect(deviceId: String, callback: @escaping (Bool, String, String) -> Void, disconnectCallback: ((String, Bool, String) -> Void)?, autoConnectAndroid: Bool?) throws {
        ensureCentralManager()
        // Find peripheral by identifier
        guard let peripheral = findPeripheral(by: deviceId) else {
            callback(false, "", "Peripheral not found")
            return
        }
        
        // Check if already connected
        if peripheral.state == .connected {
            callback(true, deviceId, "")
            return
        }
        
        // Store connection callback and disconnect callback
        let delegate = BlePeripheralDelegate(deviceId: deviceId, manager: self)
        delegate.connectionCallback = callback
        delegate.disconnectEventCallback = disconnectCallback
        peripheralDelegates[deviceId] = delegate
        peripheral.delegate = delegate
        
        // Connect to peripheral
        centralManager.connect(peripheral, options: nil)
    }
    
    public func disconnect(deviceId: String, callback: @escaping (Bool, String) -> Void) throws {
        ensureCentralManager()
        guard let peripheral = connectedPeripherals[deviceId] else {
            callback(false, "Peripheral not connected")
            return
        }
        
        // Store disconnect callback in delegate
        peripheralDelegates[deviceId]?.disconnectionCallback = callback
        
        // Mark this as an intentional disconnection
        intentionalDisconnections.insert(deviceId)
        
        centralManager.cancelPeripheralConnection(peripheral)
    }
    
    public func isConnected(deviceId: String) throws -> Bool {
        if let peripheral = connectedPeripherals[deviceId] {
            return peripheral.state == .connected
        } else {
            return false
        }
    }
    
    public func requestMTU(deviceId: String, mtu: Double) throws -> Double {
        guard let peripheral = connectedPeripherals[deviceId] else {
            return Double(-1)
        }
        
        return Double(peripheral.maximumWriteValueLength(for: .withoutResponse))
    }
    
    public func readRSSI(deviceId: String, callback: @escaping (Bool, Double, String) -> Void) throws {
        guard let peripheral = connectedPeripherals[deviceId] else {
            callback(false, 0.0, "Device not connected")
            return
        }
        
        // Ensure peripheral delegate exists for RSSI response handling
        guard let delegate = peripheralDelegates[deviceId] else {
            callback(false, 0.0, "Device not properly connected or delegate not found")
            return
        }
        
        // Store callback for when RSSI is read
        delegate.rssiCallback = callback
        
        // Initiate RSSI read
        peripheral.readRSSI()
    }
    
    // MARK: - Service Discovery
    public func discoverServices(deviceId: String, callback: @escaping (Bool, String) -> Void) throws {
        guard let peripheral = connectedPeripherals[deviceId] else {
            callback(false, "Peripheral not connected")
            return
        }

        guard let delegate = peripheralDelegates[deviceId] else {
            callback(false, "Peripheral delegate not found")
            return
        }

        // If services already discovered, resolve immediately to avoid
        // CoreBluetooth silently skipping the didDiscoverServices callback.
        if delegate.servicesDiscovered, let services = peripheral.services, !services.isEmpty {
            callback(true, "")
            return
        }

        delegate.serviceDiscoveryCallback = callback
        peripheral.discoverServices(nil)
    }

    public func discoverServicesWithCharacteristics(deviceId: String, callback: @escaping (Bool, String) -> Void) throws {
        guard let peripheral = connectedPeripherals[deviceId] else {
            callback(false, "Peripheral not connected")
            return
        }

        guard let delegate = peripheralDelegates[deviceId] else {
            callback(false, "Peripheral delegate not found")
            return
        }

        // If services and all characteristics are already discovered, resolve immediately.
        if delegate.servicesDiscovered,
           let services = peripheral.services, !services.isEmpty,
           services.allSatisfy({ $0.characteristics != nil }) {
            callback(true, "")
            return
        }

        let isFirstCaller = delegate.fullDiscoveryCallbacks.isEmpty
        delegate.fullDiscoveryCallbacks.append(callback)
        // Only trigger discovery if this is the first caller; subsequent
        // callers piggyback on the in-flight discovery via the callback array.
        if isFirstCaller {
            peripheral.discoverServices(nil)
        }
    }
    
    public func getServices(deviceId: String) throws -> [String] {
        guard let peripheral = connectedPeripherals[deviceId] else {
            return []
        }
        
        let serviceUUIDs = peripheral.services?.map { $0.uuid.uuidString } ?? []
        return serviceUUIDs
    }
    
    public func getCharacteristics(
        deviceId: String,
        serviceId: String
    ) throws -> [String] {
        guard let peripheral = connectedPeripherals[deviceId] else {
            return []
        }
        
        // Find service using CBUUID comparison
        let serviceUUID = CBUUID(string: serviceId)
        guard let service = peripheral.services?.first(where: { $0.uuid == serviceUUID }) else {
            return []
        }
        
        let characteristicUUIDs = service.characteristics?.map { $0.uuid.uuidString } ?? []
        return characteristicUUIDs
    }
    
    // MARK: - Characteristic Operations
    public func readCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: @escaping (Bool, ArrayBuffer, String) -> Void
    ) throws {
        guard let characteristic = findCharacteristic(deviceId: deviceId, serviceId: serviceId, characteristicId: characteristicId) else {
            do {
                let emptyData = Data(capacity: 0)
                let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                callback(false, emptyBuffer, "Characteristic not found")
            } catch {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                callback(false, emptyBuffer, "Characteristic not found")
            }
            return
        }
        
        // Ensure peripheral delegate exists
        guard let delegate = peripheralDelegates[deviceId] else {
            do {
                let emptyData = Data(capacity: 0)
                let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                callback(false, emptyBuffer, "Device not properly connected or delegate not found")
            } catch {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                callback(false, emptyBuffer, "Device not properly connected or delegate not found")
            }
            return
        }
        
        // Store callback in delegate using CBUUID for reliable matching
        delegate.readCallbacks[characteristic.uuid] = callback
        
        // Read characteristic value - the delegate will handle the response
        characteristic.service?.peripheral?.readValue(for: characteristic)
    }
    
    public func writeCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        data: ArrayBuffer,
        withResponse: Bool,
        callback: @escaping (Bool, ArrayBuffer, String) -> Void
    ) throws {
        guard let characteristic = findCharacteristic(deviceId: deviceId, serviceId: serviceId, characteristicId: characteristicId) else {
            let emptyBuffer = try! ArrayBuffer.copy(data: Data())
            callback(false, emptyBuffer, "Characteristic not found")
            return
        }
        
        let writeData = data.toData(copyIfNeeded: true)
        let writeType: CBCharacteristicWriteType = withResponse ? .withResponse : .withoutResponse
        
        if withResponse {
            // Ensure peripheral delegate exists for response handling
            guard let delegate = peripheralDelegates[deviceId] else {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                callback(false, emptyBuffer, "Device not properly connected or delegate not found")
                return
            }
            delegate.writeCallbacks[characteristic.uuid] = callback
            // Store written data for comparison
            delegate.writtenData[characteristic.uuid] = writeData
        }
        
        characteristic.service?.peripheral?.writeValue(writeData, for: characteristic, type: writeType)
        
        if !withResponse {
            let emptyBuffer = try! ArrayBuffer.copy(data: Data())
            callback(true, emptyBuffer, "")
        }
    }
    
    public func subscribeToCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        updateCallback: @escaping (String, ArrayBuffer) -> Void,
        completionCallback: @escaping (Bool, String) -> Void
    ) throws {
        guard let characteristic = findCharacteristic(deviceId: deviceId, serviceId: serviceId, characteristicId: characteristicId) else {
            completionCallback(false, "Characteristic not found")
            return
        }

        // Ensure peripheral delegate exists
        guard let delegate = peripheralDelegates[deviceId] else {
            completionCallback(false, "Device not properly connected or delegate not found")
            return
        }

        delegate.notificationCallbacks[characteristic.uuid] = updateCallback
        delegate.subscriptionCallbacks[characteristic.uuid] = completionCallback

        characteristic.service?.peripheral?.setNotifyValue(true, for: characteristic)
    }

    public func unsubscribeFromCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: @escaping (Bool, String) -> Void
    ) throws {
        guard let characteristic = findCharacteristic(deviceId: deviceId, serviceId: serviceId, characteristicId: characteristicId) else {
            callback(false, "Characteristic not found")
            return
        }
        
        // Ensure peripheral delegate exists
        guard let delegate = peripheralDelegates[deviceId] else {
            callback(false, "Device not properly connected or delegate not found")
            return
        }
        
        delegate.notificationCallbacks.removeValue(forKey: characteristic.uuid)
        delegate.unsubscriptionCallbacks[characteristic.uuid] = callback
        
        characteristic.service?.peripheral?.setNotifyValue(false, for: characteristic)
    }

    // `throws` is required by the Nitro-generated HybridNativeBleNitroSpec protocol
    // for all synchronous methods, even though this implementation never throws.
    public func isSubscribedToCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String
    ) throws -> Bool {
        guard let characteristic = findCharacteristic(
            deviceId: deviceId,
            serviceId: serviceId,
            characteristicId: characteristicId
        ) else {
            return false
        }
        return characteristic.isNotifying
    }

    // MARK: - Helper Methods
    private func findPeripheral(by deviceId: String) -> CBPeripheral? {
        ensureCentralManager()
        // Check connected peripherals first
        if let peripheral = connectedPeripherals[deviceId] {
            return peripheral
        }
        
        // Check discovered peripherals
        if let peripheral = discoveredPeripherals[deviceId] {
            return peripheral
        }
        
        // Try to retrieve by UUID as fallback
        guard let uuid = UUID(uuidString: deviceId) else { return nil }
        return centralManager.retrievePeripherals(withIdentifiers: [uuid]).first
    }
    
    private func findCharacteristic(deviceId: String, serviceId: String, characteristicId: String) -> CBCharacteristic? {
        guard let peripheral = connectedPeripherals[deviceId] else {
            return nil
        }
        
        let serviceUUID = CBUUID(string: serviceId)
        let characteristicUUID = CBUUID(string: characteristicId)
        
        guard let service = peripheral.services?.first(where: { $0.uuid == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid == characteristicUUID }) else {
            return nil
        }
        
        
        return characteristic
    }
    
    internal func mapCBManagerStateToBLEState(_ state: CBManagerState) -> BLEState {
        switch state {
        case .unknown:
            return .unknown
        case .resetting:
            return .resetting
        case .unsupported:
            return .unsupported
        case .unauthorized:
            return .unauthorized
        case .poweredOff:
            return .poweredoff
        case .poweredOn:
            return .poweredon
        @unknown default:
            return .unknown
        }
    }

    // MARK: - Helper Methods
    
    internal func handleStateChange(_ state: BLEState) {
        stateChangeCallback?(state)
    }
    
    internal func handleStateRestoration(_ dict: [String: Any]) {
        // Restore connected peripherals
        if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] {
            var restoredDevices: [BLEDevice] = []
            
            for peripheral in peripherals {
                let deviceId = peripheral.identifier.uuidString
                
                // Add to our tracking dictionaries
                discoveredPeripherals[deviceId] = peripheral
                if peripheral.state == .connected {
                    connectedPeripherals[deviceId] = peripheral
                }
                
                // Create BLE device for the callback
                let device = BLEDevice(
                    id: deviceId,
                    name: peripheral.name ?? "Restored Device",
                    rssi: 0, // RSSI not available for restored peripherals
                    manufacturerData: ManufacturerData(companyIdentifiers: []),
                    serviceUUIDs: peripheral.services?.map { $0.uuid.uuidString } ?? [],
                    isConnectable: true,
                    isConnected: peripheral.state == .connected
                )
                restoredDevices.append(device)
                
                // Set up delegate for restored peripheral
                let delegate = BlePeripheralDelegate(deviceId: deviceId, manager: self)
                peripheralDelegates[deviceId] = delegate
                peripheral.delegate = delegate
            }
            
            // Call the restore state callback if set (prioritize static over instance)
            let callback = BleNitroBleManager.globalRestoreStateCallback ?? restoreStateCallback
            callback?(restoredDevices)
        }
        
        // Restore scanning state if it was active
        if let scanServiceUUIDs = dict[CBCentralManagerRestoredStateScanServicesKey] as? [CBUUID] {
            // The system was scanning when the app was terminated
            // We can choose to resume scanning or let the app decide
            isCurrentlyScanning = true
            
            // Note: We don't automatically resume scanning here to give the app control
            // The app can check isScanning() and decide whether to resume or stop
        }
        
        // Restore scan options if available
        if let scanOptions = dict[CBCentralManagerRestoredStateScanOptionsKey] as? [String: Any] {
            // Store scan options for potential resume
            // This information can be used if the app decides to resume scanning
        }
    }
    
    internal func handleDeviceDiscovered(
        _ peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi: NSNumber
    ) {
        // Apply RSSI filter if specified
        if let filter = currentScanFilter, rssi.doubleValue < filter.rssiThreshold {
            return
        }
        
        // Store discovered peripheral for future connections
        let deviceId = peripheral.identifier.uuidString
        discoveredPeripherals[deviceId] = peripheral
        
        // Create BLE device
        let device = createBLEDevice(
            peripheral: peripheral,
            advertisementData: advertisementData,
            rssi: rssi.doubleValue
        )
        
        scanCallback?(device)
    }
    
    internal func handleDeviceConnected(_ peripheral: CBPeripheral) {
        let deviceId = peripheral.identifier.uuidString
        connectedPeripherals[deviceId] = peripheral
        
        if let delegate = peripheralDelegates[deviceId] {
            delegate.connectionCallback?(true, deviceId, "")
            delegate.connectionCallback = nil
        }
    }
    
    internal func handleDeviceConnectionFailed(_ peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        let errorMessage = error?.localizedDescription ?? "Connection failed"
        
        if let delegate = peripheralDelegates[deviceId] {
            delegate.connectionCallback?(false, "", errorMessage)
            delegate.connectionCallback = nil
        }
        
        peripheralDelegates.removeValue(forKey: deviceId)
    }
    
    internal func handleDeviceDisconnected(_ peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        connectedPeripherals.removeValue(forKey: deviceId)
        
        // Determine if this was an intentional or interrupted disconnection
        let wasIntentional = intentionalDisconnections.contains(deviceId)
        let interrupted = !wasIntentional
        intentionalDisconnections.remove(deviceId)
        
        if let delegate = peripheralDelegates[deviceId] {
            // Handle the disconnect() method callback (for intentional disconnections)
            if let callback = delegate.disconnectionCallback {
                callback(error == nil, error?.localizedDescription ?? "")
                delegate.disconnectionCallback = nil
            }
            
            // Handle the disconnect event callback (for both intentional and interrupted)
            if let disconnectEventCallback = delegate.disconnectEventCallback {
                let errorMessage = error?.localizedDescription ?? ""
                disconnectEventCallback(deviceId, interrupted, errorMessage)
            }
        }
        
        peripheralDelegates.removeValue(forKey: deviceId)
    }
    
    private func createBLEDevice(
        peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi: Double
    ) -> BLEDevice {
        let deviceId = peripheral.identifier.uuidString
        let deviceName = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unknown"
        
        // Extract service UUIDs
        let serviceUUIDs = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID])?.map { $0.uuidString } ?? []
        
        // Extract manufacturer data
        let manufacturerData = extractManufacturerData(from: advertisementData)
        
        // Check if connectable
        let isConnectable = (advertisementData[CBAdvertisementDataIsConnectable] as? Bool) ?? true
        
        return BLEDevice(
            id: deviceId,
            name: deviceName,
            rssi: rssi,
            manufacturerData: manufacturerData,
            serviceUUIDs: serviceUUIDs,
            isConnectable: isConnectable,
            isConnected: peripheral.state == .connected
        )
    }
    
    private func extractManufacturerData(from advertisementData: [String: Any]) -> ManufacturerData {
        guard let manufacturerDataRaw = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data else {
            return ManufacturerData(companyIdentifiers: [])
        }
        
        // Parse manufacturer data (first 2 bytes are company identifier)
        guard manufacturerDataRaw.count >= 2 else {
            return ManufacturerData(companyIdentifiers: [])
        }
        
        let companyId = manufacturerDataRaw.prefix(2).withUnsafeBytes { $0.load(as: UInt16.self) }
        let dataBytes = Data(manufacturerDataRaw.dropFirst(2))
        
        do {
            let capacityData = Data(capacity: dataBytes.count)
            let finalData = capacityData + dataBytes
            let arrayBuffer = try ArrayBuffer.copy(data: finalData)
            
            let entry = ManufacturerDataEntry(
                id: String(companyId),
                data: arrayBuffer
            )
            
            return ManufacturerData(companyIdentifiers: [entry])
        } catch {
            let emptyBuffer = try! ArrayBuffer.copy(data: Data())
            let entry = ManufacturerDataEntry(
                id: String(companyId),
                data: emptyBuffer
            )
            return ManufacturerData(companyIdentifiers: [entry])
        }
    }

    public func openSettings() throws -> Promise<Void> {
        return Promise.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                // Ask the system to open that URL.
                await UIApplication.shared.open(url)
            }
        }
    }

    // MARK: - Peripheral / GATT Server Methods

    public func startAdvertising(serviceUUIDs: [String], localName: String) throws {
        ensureCentralManager()
        guard peripheralManager.state == .poweredOn else {
            throw NSError(domain: "BleNitroError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Peripheral manager is not powered on"
            ])
        }

        var advertisementData: [String: Any] = [:]
        if !serviceUUIDs.isEmpty {
            advertisementData[CBAdvertisementDataServiceUUIDsKey] = serviceUUIDs.map { CBUUID(string: $0) }
        }
        if !localName.isEmpty {
            advertisementData[CBAdvertisementDataLocalNameKey] = localName
        }

        peripheralManager.startAdvertising(advertisementData.isEmpty ? nil : advertisementData)
        isCurrentlyAdvertising = true
    }

    public func stopAdvertising() throws {
        ensureCentralManager()
        peripheralManager.stopAdvertising()
        isCurrentlyAdvertising = false
    }

    public func isAdvertising() throws -> Bool {
        return isCurrentlyAdvertising
    }

    public func addService(serviceUUID: String, isPrimary: Bool, characteristics: [GATTCharacteristicConfig]) throws {
        ensureCentralManager()

        let cbUUID = CBUUID(string: serviceUUID)
        let service = CBMutableService(type: cbUUID, primary: isPrimary)

        var cbCharacteristics: [CBMutableCharacteristic] = []
        for config in characteristics {
            let charUUID = CBUUID(string: config.uuid)

            // Map properties
            var cbProperties: CBCharacteristicProperties = []
            for prop in config.properties {
                switch prop {
                case .read:
                    cbProperties.insert(.read)
                case .write:
                    cbProperties.insert(.write)
                case .writewithoutresponse:
                    cbProperties.insert(.writeWithoutResponse)
                case .notify:
                    cbProperties.insert(.notify)
                case .indicate:
                    cbProperties.insert(.indicate)
                }
            }

            // Map permissions
            var cbPermissions: CBAttributePermissions = []
            for perm in config.permissions {
                switch perm {
                case .readable:
                    cbPermissions.insert(.readable)
                case .writeable:
                    cbPermissions.insert(.writeable)
                }
            }

            // Extract value: nil triggers didReceiveReadRequest (dynamic), non-nil is served by CoreBluetooth directly
            var charValue: Data? = nil
            if let variantValue = config.value {
                switch variantValue {
                case .first(_):
                    // NullType — dynamic value, use nil
                    charValue = nil
                case .second(let arrayBuffer):
                    charValue = arrayBuffer.toData(copyIfNeeded: true)
                }
            }

            let characteristic = CBMutableCharacteristic(
                type: charUUID,
                properties: cbProperties,
                value: charValue,
                permissions: cbPermissions
            )
            cbCharacteristics.append(characteristic)
        }

        service.characteristics = cbCharacteristics
        addedServices[serviceUUID] = service
        peripheralManager.add(service)
    }

    public func removeService(serviceUUID: String) throws {
        ensureCentralManager()
        guard let service = addedServices[serviceUUID] else {
            throw NSError(domain: "BleNitroError", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Service not found: \(serviceUUID)"
            ])
        }
        peripheralManager.remove(service)
        addedServices.removeValue(forKey: serviceUUID)
    }

    public func removeAllServices() throws {
        ensureCentralManager()
        peripheralManager.removeAllServices()
        addedServices.removeAll()
    }

    public func updateCharacteristicValue(serviceUUID: String, characteristicUUID: String, data: ArrayBuffer) throws {
        ensureCentralManager()
        let writeData = data.toData(copyIfNeeded: true)

        // Update cache with 60s TTL
        let cacheKey = "\(serviceUUID):\(characteristicUUID)"
        characteristicValueCache[cacheKey] = (data: writeData, timestamp: Date())

        // Also update the CBMutableCharacteristic value if possible
        if let service = addedServices[serviceUUID],
           let chars = service.characteristics {
            let targetUUID = CBUUID(string: characteristicUUID)
            if let mutableChar = chars.first(where: { $0.uuid == targetUUID }) as? CBMutableCharacteristic {
                mutableChar.value = writeData
            }
        }
    }

    public func onReadRequest(callback: @escaping (String, String, Double, Double) -> Void) throws {
        self.readRequestCallback = callback
    }

    public func onWriteRequest(callback: @escaping (String, String, Double, ArrayBuffer, Bool) -> Void) throws {
        self.writeRequestCallback = callback
    }

    public func respondToRequest(requestId: Double, status: Double, offset: Double, data: ArrayBuffer) throws {
        ensureCentralManager()

        let attResult = CBATTError.Code(rawValue: Int(status)) ?? .success
        let responseData = data.toData(copyIfNeeded: true)

        // Handle read request response
        if let request = pendingReadRequests[requestId] {
            if !responseData.isEmpty {
                let requestOffset = Int(request.offset)
                if requestOffset < responseData.count {
                    request.value = responseData.subdata(in: requestOffset..<responseData.count)
                } else {
                    request.value = Data()
                }
            }
            peripheralManager.respond(to: request, withResult: CBATTError(attResult))
            pendingReadRequests.removeValue(forKey: requestId)
            return
        }

        // Handle write request response
        if let requests = pendingWriteRequests[requestId], let firstRequest = requests.first {
            peripheralManager.respond(to: firstRequest, withResult: CBATTError(attResult))
            pendingWriteRequests.removeValue(forKey: requestId)
            return
        }
    }

    public func notifyCharacteristic(serviceUUID: String, characteristicUUID: String, data: ArrayBuffer) throws {
        ensureCentralManager()

        guard let service = addedServices[serviceUUID],
              let chars = service.characteristics else {
            throw NSError(domain: "BleNitroError", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Service not found: \(serviceUUID)"
            ])
        }

        let targetUUID = CBUUID(string: characteristicUUID)
        guard let mutableChar = chars.first(where: { $0.uuid == targetUUID }) as? CBMutableCharacteristic else {
            throw NSError(domain: "BleNitroError", code: 3, userInfo: [
                NSLocalizedDescriptionKey: "Characteristic not found: \(characteristicUUID)"
            ])
        }

        let notifyData = data.toData(copyIfNeeded: true)

        // updateValue sends to all subscribed centrals when centrals param is nil
        let didSend = peripheralManager.updateValue(notifyData, for: mutableChar, onSubscribedCentrals: nil)
        if !didSend {
            print("[BleNitro] updateValue returned false — transmit queue is full, will retry on peripheralManagerIsReady")
        }
    }

    public func peripheralState() throws -> BLEState {
        ensureCentralManager()
        let cbState = CBManagerState(rawValue: peripheralManager.state.rawValue) ?? .unknown
        return mapCBManagerStateToBLEState(cbState)
    }

    public func subscribeToPeripheralStateChange(
        callback: @escaping (BLEState) -> Void
    ) throws -> OperationResult {
        ensureCentralManager()
        self.peripheralStateCallback = callback
        return OperationResult(success: true, error: nil)
    }

    public func unsubscribeFromPeripheralStateChange() throws -> OperationResult {
        self.peripheralStateCallback = nil
        return OperationResult(success: true, error: nil)
    }

    // MARK: - Internal Peripheral Handlers

    internal func handlePeripheralStateChange(_ state: BLEState) {
        peripheralStateCallback?(state)
    }

    internal func handleAdvertisingStarted(error: Error?) {
        if let error = error {
            print("[BleNitro] Advertising failed: \(error.localizedDescription)")
            isCurrentlyAdvertising = false
        } else {
            print("[BleNitro] Advertising started successfully")
            isCurrentlyAdvertising = true
        }
    }

    internal func handleReadRequest(_ request: CBATTRequest) {
        let deviceId = request.central.identifier.uuidString
        let characteristicUUID = request.characteristic.uuid.uuidString

        // Check cache first with 60s TTL
        let cacheKey = findCacheKey(forCharacteristicUUID: characteristicUUID)
        if let cacheKey = cacheKey,
           let cached = characteristicValueCache[cacheKey],
           Date().timeIntervalSince(cached.timestamp) < 60.0 {
            let offset = Int(request.offset)
            if offset < cached.data.count {
                request.value = cached.data.subdata(in: offset..<cached.data.count)
            } else {
                request.value = Data()
            }
            peripheralManager.respond(to: request, withResult: .success)
            return
        }

        // No valid cache — forward to JS callback
        guard let callback = readRequestCallback else {
            // No JS handler registered, respond with error
            peripheralManager.respond(to: request, withResult: .readNotPermitted)
            return
        }

        let requestId = nextRequestId
        nextRequestId += 1
        pendingReadRequests[requestId] = request

        callback(deviceId, characteristicUUID, requestId, Double(request.offset))
    }

    internal func handleWriteRequests(_ requests: [CBATTRequest]) {
        guard let firstRequest = requests.first else { return }

        let deviceId = firstRequest.central.identifier.uuidString

        guard let callback = writeRequestCallback else {
            // No JS handler registered, respond with error
            peripheralManager.respond(to: firstRequest, withResult: .writeNotPermitted)
            return
        }

        // Group all writes under a single requestId
        let requestId = nextRequestId
        nextRequestId += 1
        pendingWriteRequests[requestId] = requests

        // Forward each write request to JS
        for request in requests {
            let characteristicUUID = request.characteristic.uuid.uuidString
            let writeData = request.value ?? Data()

            do {
                let arrayBuffer = try ArrayBuffer.copy(data: writeData)
                // responseNeeded is true when the write type is .withResponse
                let responseNeeded = true
                callback(deviceId, characteristicUUID, requestId, arrayBuffer, responseNeeded)
            } catch {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                callback(deviceId, characteristicUUID, requestId, emptyBuffer, true)
            }
        }
    }

    internal func handleCentralSubscribed(central: CBCentral, characteristic: CBCharacteristic) {
        let charUUID = characteristic.uuid.uuidString
        if subscribedCentrals[charUUID] == nil {
            subscribedCentrals[charUUID] = []
        }
        // Avoid duplicate entries
        if !subscribedCentrals[charUUID]!.contains(where: { $0.identifier == central.identifier }) {
            subscribedCentrals[charUUID]!.append(central)
        }
        print("[BleNitro] Central \(central.identifier.uuidString) subscribed to \(charUUID)")
    }

    internal func handleCentralUnsubscribed(central: CBCentral, characteristic: CBCharacteristic) {
        let charUUID = characteristic.uuid.uuidString
        subscribedCentrals[charUUID]?.removeAll(where: { $0.identifier == central.identifier })
        print("[BleNitro] Central \(central.identifier.uuidString) unsubscribed from \(charUUID)")
    }

    // MARK: - Private Peripheral Helpers

    /// Find cache key matching a characteristic UUID across all services
    private func findCacheKey(forCharacteristicUUID charUUID: String) -> String? {
        for (key, _) in characteristicValueCache {
            if key.hasSuffix(":\(charUUID)") {
                return key
            }
        }
        return nil
    }
}

// MARK: - CBCentralManagerDelegate Implementation
class BleCentralManagerDelegate: NSObject, CBCentralManagerDelegate {
    weak var manager: BleNitroBleManager?
    
    init(manager: BleNitroBleManager) {
        self.manager = manager
        super.init()
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard let manager = manager else { return }
        let bleState = manager.mapCBManagerStateToBLEState(central.state)
        manager.handleStateChange(bleState)
    }
    
    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        manager?.handleDeviceDiscovered(peripheral, advertisementData: advertisementData, rssi: RSSI)
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        manager?.handleDeviceConnected(peripheral)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        manager?.handleDeviceConnectionFailed(peripheral, error: error)
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        manager?.handleDeviceDisconnected(peripheral, error: error)
    }
    
    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
        // Only handle state restoration if restoreStateIdentifier is set and a callback is registered
        guard let manager = manager,
              manager.restoreStateIdentifier != nil,
              (BleNitroBleManager.globalRestoreStateCallback != nil || manager.restoreStateCallback != nil) else {
            return
        }
        manager.handleStateRestoration(dict)
    }
}
