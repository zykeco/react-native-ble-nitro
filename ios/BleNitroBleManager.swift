import Foundation
import CoreBluetooth
import NitroModules
/**
 * iOS implementation of the BLE Nitro Manager
 * Implements the HybridNativeBleNitroSpec protocol for Core Bluetooth operations
 */
public class BleNitroBleManager: HybridNativeBleNitroSpec_base, HybridNativeBleNitroSpec_protocol {
    
    // MARK: - Constants
    private static let restoreStateIdentifier = "react-native-ble-nitro"
    
    // MARK: - Static Properties
    private static var globalRestoreStateCallback: (([BLEDevice]) -> Void)?
    
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
    
    // MARK: - Restore State Properties
    private var restoreStateCallback: (([BLEDevice]) -> Void)?

    // MARK: - Initialization
    public override init() {
        super.init()
        setupCentralManager()
    }
    
    private func setupCentralManager() {
        centralManagerDelegate = BleCentralManagerDelegate(manager: self)
        
        // Create options dictionary for central manager with fixed restore identifier
        let options: [String: Any] = [
            CBCentralManagerOptionRestoreIdentifierKey: BleNitroBleManager.restoreStateIdentifier
        ]
        
        centralManager = CBCentralManager(delegate: centralManagerDelegate, queue: DispatchQueue.main, options: options)
    }
    
    
    // MARK: - State Management
    public func state() throws -> BLEState {
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
        self.stateChangeCallback = stateCallback
        return OperationResult(success: true, error: nil)
    }

    public func unsubscribeFromStateChange() throws -> OperationResult {
        self.stateChangeCallback = nil
        return OperationResult(success: true, error: nil)
    }
    
    // MARK: - Restore State Management
    public func setRestoreStateCallback(callback: @escaping ([BLEDevice]) -> Void) throws {
        print("🔄 setRestoreStateCallback called")
        // Set both static and instance variables
        BleNitroBleManager.globalRestoreStateCallback = callback
        self.restoreStateCallback = callback
        print("🔄 Callback set successfully")
    }
    
    // MARK: - Scanning Operations
    public func startScan(filter: ScanFilter, callback: @escaping (BLEDevice?, String?) -> Void) throws {
        guard centralManager.state == .poweredOn else {
            throw NSError(domain: "BleNitroError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Bluetooth is not powered on"
            ])
        }

        // remove error option from callback
        func scanCallbackWrapper(device: BLEDevice?) {
            callback(device, nil)
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
        var connectedDevices: [BLEDevice] = []
        
        // First check our tracked connected peripherals
        for (deviceId, peripheral) in connectedPeripherals {
            let device = BLEDevice(
                id: deviceId,
                name: peripheral.name ?? "Unknown Device",
                rssi: 0, // RSSI not available for connected devices without explicit read
                manufacturerData: ManufacturerData(companyIdentifiers: []), // Not available for connected devices
                serviceUUIDs: peripheral.services?.map { $0.uuid.uuidString } ?? [],
                isConnectable: true // Already connected, so it was connectable
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
                    isConnectable: true
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
                        isConnectable: true
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
        
        peripheralDelegates[deviceId]?.serviceDiscoveryCallback = callback
        peripheral.discoverServices(nil)
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
        serviceId: String,
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
        resultCallback: @escaping (Bool, String) -> Void
    ) throws {
        guard let characteristic = findCharacteristic(deviceId: deviceId, serviceId: serviceId, characteristicId: characteristicId) else {
            resultCallback(false, "Characteristic not found")
            return
        }
        
        // Ensure peripheral delegate exists
        guard let delegate = peripheralDelegates[deviceId] else {
            resultCallback(false, "Device not properly connected or delegate not found")
            return
        }
        
        delegate.notificationCallbacks[characteristic.uuid] = updateCallback
        delegate.subscriptionCallbacks[characteristic.uuid] = resultCallback
        
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
    
    // MARK: - Helper Methods
    private func findPeripheral(by deviceId: String) -> CBPeripheral? {
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
                    isConnectable: true
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
            isConnectable: isConnectable
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
        manager?.handleStateRestoration(dict)
    }
}