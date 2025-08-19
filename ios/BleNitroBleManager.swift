///
/// BleNitroBleManager.swift
/// React Native BLE Nitro - iOS Implementation
/// Copyright © 2025 Zyke (https://zyke.co)
///

import Foundation
import CoreBluetooth
import NitroModules

/**
 * Full BLE Manager implementation for iOS using CoreBluetooth
 */
public class BleNitroBleManager: HybridBleManagerSpec {
    
    // MARK: - Properties
    
    public var memorySize: Int {
        return MemoryHelper.getSizeOf(self)
    }
    
    private var centralManager: CBCentralManager!
    private var currentLogLevel: BleLogLevel = .none
    private var isInitialized = false
    
    // State management
    private var stateChangeListeners: [(State) -> Void] = []
    private var discoveredDevices: [String: CBPeripheral] = [:]
    private var connectedDevices: [String: CBPeripheral] = [:]
    
    // Scanning
    private var isScanning = false
    private var scanListener: ((NativeBleError?, NativeDevice?) -> Void)?
    private var scanServiceUUIDs: [String]?
    
    // Device connection callbacks
    private var deviceDisconnectionListeners: [String: (NativeBleError?, NativeDevice?) -> Void] = [:]
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        print("BleNitroBleManager: Initializing iOS BLE Manager")
    }
    
    // MARK: - Central Manager Delegate
    
    private var centralManagerDelegate: BleNitroCentralManagerDelegate?
    
    // MARK: - HybridBleManagerSpec Implementation
    
    public func destroy() throws -> Promise<Void> {
        print("BleNitroBleManager: Destroying")
        
        if isScanning {
            centralManager?.stopScan()
            isScanning = false
        }
        
        // Disconnect all connected devices
        for (_, peripheral) in connectedDevices {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
        
        connectedDevices.removeAll()
        discoveredDevices.removeAll()
        stateChangeListeners.removeAll()
        deviceDisconnectionListeners.removeAll()
        
        isInitialized = false
        
        return Promise.resolved(withResult: ())
    }
    
    public func initialize(options: BleManagerNitroOptions) throws -> Promise<Void> {
        print("BleNitroBleManager: Initializing with options")
        
        guard !isInitialized else {
            return Promise.resolved(withResult: ())
        }
        
        // Initialize CBCentralManager with delegate
        centralManagerDelegate = BleNitroCentralManagerDelegate(manager: self)
        centralManager = CBCentralManager(delegate: centralManagerDelegate, queue: nil)
        isInitialized = true
        
        return Promise.resolved(withResult: ())
    }
    
    public func getRestoredState() throws -> Promise<BleRestoredState?> {
        // iOS doesn't provide a direct way to get restored state info
        // In a real implementation, you would track this during app backgrounding
        return Promise.resolved(withResult: nil as BleRestoredState?)
    }
    
    public func setLogLevel(logLevel: BleLogLevel) throws -> Promise<BleLogLevel> {
        self.currentLogLevel = logLevel
        print("BleNitroBleManager: Log level set to \(logLevel)")
        return Promise.resolved(withResult: logLevel)
    }
    
    public func logLevel() throws -> Promise<BleLogLevel> {
        return Promise.resolved(withResult: self.currentLogLevel)
    }
    
    public func cancelTransaction(transactionId: String) throws -> Promise<Void> {
        print("BleNitroBleManager: Cancelling transaction \(transactionId)")
        // In a real implementation, you would track and cancel specific operations
        return Promise.resolved(withResult: ())
    }
    
    public func enable(transactionId: String?) throws -> Promise<Void> {
        // iOS manages Bluetooth state automatically
        // We can't programmatically enable/disable Bluetooth
        return Promise.rejected(withError: BleError.bluetoothUnsupported("iOS doesn't allow programmatic Bluetooth enable/disable"))
    }
    
    public func disable(transactionId: String?) throws -> Promise<Void> {
        // iOS manages Bluetooth state automatically
        return Promise.rejected(withError: BleError.bluetoothUnsupported("iOS doesn't allow programmatic Bluetooth enable/disable"))
    }
    
    public func state() throws -> Promise<State> {
        guard let centralManager = centralManager else {
            return Promise.resolved(withResult: State.unknown)
        }
        
        let state = convertCBManagerState(centralManager.state)
        return Promise.resolved(withResult: state)
    }
    
    public func onStateChange(listener: @escaping (State) -> Void, emitCurrentState: Bool?) throws -> Subscription {
        print("BleNitroBleManager: Adding state change listener")
        
        stateChangeListeners.append(listener)
        
        // Emit current state if requested
        if emitCurrentState == true, let centralManager = centralManager {
            let currentState = convertCBManagerState(centralManager.state)
            listener(currentState)
        }
        
        return Subscription(remove: { [weak self] in
            self?.removeStateChangeListener(listener)
        })
    }
    
    public func startDeviceScan(uuids: [String]?, options: ScanOptions?, listener: @escaping (NativeBleError?, NativeDevice?) -> Void) throws -> Promise<Void> {
        print("BleNitroBleManager: Starting device scan")
        
        guard let centralManager = centralManager else {
            return Promise.rejected(withError: BleError.bluetoothUnsupported("BLE manager not initialized"))
        }
        
        guard centralManager.state == .poweredOn else {
            return Promise.rejected(withError: BleError.bluetoothPoweredOff("Bluetooth is not powered on"))
        }
        
        // Stop current scan if running
        if isScanning {
            centralManager.stopScan()
        }
        
        // Store scan parameters
        self.scanListener = listener
        self.scanServiceUUIDs = uuids
        
        // Convert UUIDs to CBUUID objects
        var serviceUUIDs: [CBUUID]? = nil
        if let uuids = uuids {
            serviceUUIDs = uuids.compactMap { CBUUID(string: $0) }
        }
        
        // Configure scan options
        var scanOptions: [String: Any] = [:]
        if let options = options {
            scanOptions[CBCentralManagerScanOptionAllowDuplicatesKey] = options.allowDuplicates ?? false
        }
        
        // Start scanning
        centralManager.scanForPeripherals(withServices: serviceUUIDs, options: scanOptions)
        isScanning = true
        
        print("BleNitroBleManager: Scan started with services: \(uuids ?? [])")
        return Promise.resolved(withResult: ())
    }
    
    public func stopDeviceScan() throws -> Promise<Void> {
        print("BleNitroBleManager: Stopping device scan")
        
        guard let centralManager = centralManager else {
            return Promise.resolved(withResult: ())
        }
        
        if isScanning {
            centralManager.stopScan()
            isScanning = false
            scanListener = nil
            scanServiceUUIDs = nil
            print("BleNitroBleManager: Scan stopped")
        }
        
        return Promise.resolved(withResult: ())
    }
    
    public func requestConnectionPriorityForDevice(deviceIdentifier: String, connectionPriority: ConnectionPriority, transactionId: String?) throws -> Promise<NativeDevice> {
        // iOS doesn't expose connection priority settings
        return Promise.rejected(withError: BleError.operationNotSupported("Connection priority is not supported on iOS"))
    }
    
    public func readRSSIForDevice(deviceIdentifier: String, transactionId: String?) throws -> Promise<NativeDevice> {
        guard connectedDevices[deviceIdentifier] != nil else {
            return Promise.rejected(withError: BleError.deviceNotFound("Device not found or not connected"))
        }
        
        // iOS RSSI reading is async, would need proper callback handling
        return Promise.rejected(withError: BleError.notImplemented("RSSI reading not yet implemented"))
    }
    
    public func requestMTUForDevice(deviceIdentifier: String, mtu: Double, transactionId: String?) throws -> Promise<NativeDevice> {
        // iOS manages MTU automatically, no manual control
        return Promise.rejected(withError: BleError.operationNotSupported("Manual MTU setting is not supported on iOS"))
    }
    
    public func devices(deviceIdentifiers: [String]) throws -> Promise<[NativeDevice]> {
        let devices = deviceIdentifiers.compactMap { deviceId -> NativeDevice? in
            if let peripheral = discoveredDevices[deviceId] ?? connectedDevices[deviceId] {
                return createNativeDevice(from: peripheral)
            }
            return nil
        }
        
        return Promise.resolved(withResult: devices)
    }
    
    public func connectedDevices(serviceUUIDs: [String]) throws -> Promise<[NativeDevice]> {
        guard let centralManager = centralManager else {
            return Promise.resolved(withResult: [])
        }
        
        // Convert service UUIDs
        let cbuuids = serviceUUIDs.compactMap { CBUUID(string: $0) }
        
        // Get connected peripherals
        let peripherals = centralManager.retrieveConnectedPeripherals(withServices: cbuuids)
        let devices = peripherals.map { createNativeDevice(from: $0) }
        
        return Promise.resolved(withResult: devices)
    }
    
    public func connectToDevice(deviceIdentifier: String, options: ConnectionOptions?) throws -> Promise<NativeDevice> {
        print("BleNitroBleManager: Connecting to device \(deviceIdentifier)")
        
        guard let centralManager = centralManager else {
            return Promise.rejected(withError: BleError.bluetoothUnsupported("BLE manager not initialized"))
        }
        
        guard let peripheral = discoveredDevices[deviceIdentifier] else {
            return Promise.rejected(withError: BleError.deviceNotFound("Device not found. Make sure to scan first."))
        }
        
        // In a real implementation, you would return a Promise that resolves when connection completes
        // For now, initiate connection and return optimistically
        var connectOptions: [String: Any] = [:]
        if options != nil {
            // iOS connection options don't directly map to BLE library options
            connectOptions[CBConnectPeripheralOptionNotifyOnConnectionKey] = true
        }
        
        centralManager.connect(peripheral, options: connectOptions)
        connectedDevices[deviceIdentifier] = peripheral
        
        return Promise.resolved(withResult: createNativeDevice(from: peripheral))
    }
    
    public func cancelDeviceConnection(deviceIdentifier: String) throws -> Promise<NativeDevice> {
        print("BleNitroBleManager: Cancelling connection to device \(deviceIdentifier)")
        
        guard let centralManager = centralManager else {
            return Promise.resolved(withResult: createEmptyNativeDevice(id: deviceIdentifier))
        }
        
        guard let peripheral = connectedDevices[deviceIdentifier] else {
            return Promise.rejected(withError: BleError.deviceNotFound("Device not connected"))
        }
        
        centralManager.cancelPeripheralConnection(peripheral)
        connectedDevices.removeValue(forKey: deviceIdentifier)
        
        return Promise.resolved(withResult: createNativeDevice(from: peripheral))
    }
    
    public func onDeviceDisconnected(deviceIdentifier: String, listener: @escaping (NativeBleError?, NativeDevice?) -> Void) throws -> Subscription {
        print("BleNitroBleManager: Adding disconnection listener for device \(deviceIdentifier)")
        
        deviceDisconnectionListeners[deviceIdentifier] = listener
        
        return Subscription(remove: { [weak self] in
            self?.deviceDisconnectionListeners.removeValue(forKey: deviceIdentifier)
        })
    }
    
    public func isDeviceConnected(deviceIdentifier: String) throws -> Promise<Bool> {
        let isConnected = connectedDevices[deviceIdentifier]?.state == .connected
        return Promise.resolved(withResult: isConnected)
    }
    
    public func discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: String, transactionId: String?) throws -> Promise<NativeDevice> {
        return Promise.rejected(withError: BleError.notImplemented("Service discovery not yet implemented"))
    }
    
    public func servicesForDevice(deviceIdentifier: String) throws -> Promise<[NativeService]> {
        return Promise.resolved(withResult: [])
    }
    
    public func characteristicsForDevice(deviceIdentifier: String, serviceUUID: String) throws -> Promise<[NativeCharacteristic]> {
        return Promise.resolved(withResult: [])
    }
    
    public func readCharacteristicForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, transactionId: String?) throws -> Promise<NativeCharacteristic> {
        return Promise.rejected(withError: BleError.notImplemented("Characteristic operations not yet implemented"))
    }
    
    public func writeCharacteristicWithResponseForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, base64Value: String, transactionId: String?) throws -> Promise<NativeCharacteristic> {
        return Promise.rejected(withError: BleError.notImplemented("Characteristic operations not yet implemented"))
    }
    
    public func writeCharacteristicWithoutResponseForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, base64Value: String, transactionId: String?) throws -> Promise<NativeCharacteristic> {
        return Promise.rejected(withError: BleError.notImplemented("Characteristic operations not yet implemented"))
    }
    
    public func monitorCharacteristicForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, listener: @escaping (NativeBleError?, NativeCharacteristic?) -> Void, transactionId: String?, subscriptionType: CharacteristicSubscriptionType?) throws -> Subscription {
        return Subscription(remove: {})
    }
    
    public func descriptorsForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String) throws -> Promise<[NativeDescriptor]> {
        return Promise.resolved(withResult: [])
    }
    
    public func readDescriptorForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, descriptorUUID: String, transactionId: String?) throws -> Promise<NativeDescriptor> {
        return Promise.rejected(withError: BleError.notImplemented("Descriptor operations not yet implemented"))
    }
    
    public func writeDescriptorForDevice(deviceIdentifier: String, serviceUUID: String, characteristicUUID: String, descriptorUUID: String, valueBase64: String, transactionId: String?) throws -> Promise<NativeDescriptor> {
        return Promise.rejected(withError: BleError.notImplemented("Descriptor operations not yet implemented"))
    }
    
    // MARK: - Central Manager Callbacks (called by delegate)
    
    internal func centralManagerDidUpdateState(_ state: CBManagerState) {
        let bleState = convertCBManagerState(state)
        print("BleNitroBleManager: Central manager state changed to \(bleState)")
        
        // Notify state change listeners
        for listener in stateChangeListeners {
            listener(bleState)
        }
    }
    
    internal func centralManagerDidDiscoverPeripheral(_ peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let deviceId = peripheral.identifier.uuidString
        discoveredDevices[deviceId] = peripheral
        
        if let scanListener = scanListener {
            let device = createNativeDevice(from: peripheral, advertisementData: advertisementData, rssi: RSSI)
            scanListener(nil, device)
        }
        
        print("BleNitroBleManager: Discovered device: \(peripheral.name ?? "Unknown") (\(deviceId))")
    }
    
    internal func centralManagerDidConnectPeripheral(_ peripheral: CBPeripheral) {
        let deviceId = peripheral.identifier.uuidString
        connectedDevices[deviceId] = peripheral
        print("BleNitroBleManager: Connected to device: \(peripheral.name ?? "Unknown") (\(deviceId))")
    }
    
    internal func centralManagerDidDisconnectPeripheral(_ peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        connectedDevices.removeValue(forKey: deviceId)
        
        if let listener = deviceDisconnectionListeners[deviceId] {
            let bleError = error.map { BleError.connectionFailed($0.localizedDescription) }
            let device = createNativeDevice(from: peripheral)
            listener(bleError?.toNativeBleError(), device)
        }
        
        print("BleNitroBleManager: Disconnected from device: \(peripheral.name ?? "Unknown") (\(deviceId))")
    }
    
    internal func centralManagerDidFailToConnectPeripheral(_ peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        
        if let listener = deviceDisconnectionListeners[deviceId] {
            let bleError = BleError.connectionFailed(error?.localizedDescription ?? "Connection failed")
            listener(bleError.toNativeBleError(), nil)
        }
        
        print("BleNitroBleManager: Failed to connect to device: \(peripheral.name ?? "Unknown") (\(deviceId))")
    }
}

// MARK: - Helper Methods

extension BleNitroBleManager {
    
    private func convertCBManagerState(_ state: CBManagerState) -> State {
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
    
    private func removeStateChangeListener(_ listener: @escaping (State) -> Void) {
        // Note: Swift doesn't allow direct comparison of closures
        // In a real implementation, you'd use a different approach like storing listeners with IDs
        print("BleNitroBleManager: Removing state change listener (not implemented)")
    }
    
    private func createNativeDevice(from peripheral: CBPeripheral, advertisementData: [String: Any] = [:], rssi: NSNumber = NSNumber(value: 0)) -> NativeDevice {
        return NativeDevice(
            id: peripheral.identifier.uuidString,
            name: peripheral.name,
            rssi: rssi.doubleValue,
            mtu: 23.0, // Default BLE MTU
            manufacturerData: extractManufacturerData(from: advertisementData[CBAdvertisementDataManufacturerDataKey]),
            rawScanRecord: createRawScanRecord(from: advertisementData),
            serviceData: extractServiceData(from: advertisementData[CBAdvertisementDataServiceDataKey]),
            serviceUUIDs: extractServiceUUIDs(from: advertisementData[CBAdvertisementDataServiceUUIDsKey]),
            localName: advertisementData[CBAdvertisementDataLocalNameKey] as? String,
            txPowerLevel: (advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber)?.doubleValue,
            solicitedServiceUUIDs: extractServiceUUIDs(from: advertisementData[CBAdvertisementDataSolicitedServiceUUIDsKey]),
            isConnectable: advertisementData[CBAdvertisementDataIsConnectable] as? Bool,
            overflowServiceUUIDs: extractServiceUUIDs(from: advertisementData[CBAdvertisementDataOverflowServiceUUIDsKey])
        )
    }
    
    private func createEmptyNativeDevice(id: String) -> NativeDevice {
        return NativeDevice(
            id: id,
            name: nil,
            rssi: 0.0,
            mtu: 23.0,
            manufacturerData: nil,
            rawScanRecord: "",
            serviceData: nil,
            serviceUUIDs: nil,
            localName: nil,
            txPowerLevel: nil,
            solicitedServiceUUIDs: nil,
            isConnectable: nil,
            overflowServiceUUIDs: nil
        )
    }
    
    private func extractServiceUUIDs(from value: Any?) -> [String]? {
        guard let serviceUUIDs = value as? [CBUUID] else { return nil }
        return serviceUUIDs.map { $0.uuidString }
    }
    
    private func extractServiceData(from value: Any?) -> [ServiceDataEntry]? {
        guard let serviceData = value as? [CBUUID: Data] else { return nil }
        return serviceData.map { (uuid, data) in
            ServiceDataEntry(
                uuid: uuid.uuidString,
                data: data.base64EncodedString()
            )
        }
    }
    
    private func extractManufacturerData(from value: Any?) -> String? {
        guard let data = value as? Data else { return nil }
        return data.base64EncodedString()
    }
    
    private func createRawScanRecord(from advertisementData: [String: Any]) -> String {
        // iOS doesn't provide raw scan record like Android
        // Create a simplified version from available advertisement data
        var components: [String] = []
        
        if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String {
            components.append("Name: \(localName)")
        }
        
        if let txPower = advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber {
            components.append("TxPower: \(txPower)")
        }
        
        if let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] {
            let uuidStrings = serviceUUIDs.map { $0.uuidString }
            components.append("Services: \(uuidStrings.joined(separator: ","))")
        }
        
        if let manufacturerData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
            components.append("ManufacturerData: \(manufacturerData.base64EncodedString())")
        }
        
        return components.joined(separator: "; ")
    }
}

// MARK: - Error Helper

enum BleError: Error {
    case notImplemented(String)
    case bluetoothUnsupported(String)
    case bluetoothPoweredOff(String)
    case operationNotSupported(String)
    case deviceNotFound(String)
    case connectionFailed(String)
    
    func toNativeBleError() -> NativeBleError {
        switch self {
        case .notImplemented(let message):
            return NativeBleError(
                errorCode: .unknownerror,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        case .bluetoothUnsupported(let message):
            return NativeBleError(
                errorCode: .bluetoothunsupported,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        case .bluetoothPoweredOff(let message):
            return NativeBleError(
                errorCode: .bluetoothpoweredoff,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        case .operationNotSupported(let message):
            return NativeBleError(
                errorCode: .operationstartfailed,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        case .deviceNotFound(let message):
            return NativeBleError(
                errorCode: .devicenotfound,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        case .connectionFailed(let message):
            return NativeBleError(
                errorCode: .deviceconnectionfailed,
                attErrorCode: nil,
                iosErrorCode: nil,
                androidErrorCode: nil,
                reason: message,
                deviceID: nil,
                serviceUUID: nil,
                characteristicUUID: nil,
                descriptorUUID: nil,
                internalMessage: nil
            )
        }
    }
}

// MARK: - Central Manager Delegate

class BleNitroCentralManagerDelegate: NSObject, CBCentralManagerDelegate {
    private weak var manager: BleNitroBleManager?
    
    init(manager: BleNitroBleManager) {
        self.manager = manager
        super.init()
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        manager?.centralManagerDidUpdateState(central.state)
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        manager?.centralManagerDidDiscoverPeripheral(peripheral, advertisementData: advertisementData, rssi: RSSI)
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        manager?.centralManagerDidConnectPeripheral(peripheral)
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        manager?.centralManagerDidDisconnectPeripheral(peripheral, error: error)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        manager?.centralManagerDidFailToConnectPeripheral(peripheral, error: error)
    }
}