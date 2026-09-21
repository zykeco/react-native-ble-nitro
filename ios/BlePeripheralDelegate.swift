import Foundation
import CoreBluetooth
import NitroModules

/**
 * Helper class to handle CBPeripheralDelegate operations
 * Manages callbacks for characteristic operations and service discovery
 */
class BlePeripheralDelegate: NSObject, CBPeripheralDelegate {
    
    // MARK: - Properties
    let deviceId: String
    weak var manager: BleNitroBleManager?
    
    // Callback storage
    var connectionCallback: ((Bool, String, BLENativeError?) -> Void)?
    var disconnectionCallback: ((Bool, BLENativeError?) -> Void)?
    var disconnectEventCallback: ((String, Bool, BLENativeError?) -> Void)?
    var serviceDiscoveryCallback: ((Bool, BLENativeError?) -> Void)?
    var characteristicDiscoveryCallbacks: [String: (Bool, BLENativeError?) -> Void] = [:]

    // Full discovery (services + characteristics) callbacks and state
    var fullDiscoveryCallbacks: [(Bool, BLENativeError?) -> Void] = []
    var servicesDiscovered = false
    var characteristicsDiscoveredCount = 0
    var expectedCharacteristicsCount = 0
    var characteristicDiscoveryError: BLENativeError?

    // RSSI callback
    var rssiCallback: ((Bool, Double, BLENativeError?) -> Void)?
    
    // Operation callbacks - using CBUUID as key for reliable UUID matching
    var readCallbacks: [CBUUID: (Bool, ArrayBuffer, BLENativeError?) -> Void] = [:]
    var writeCallbacks: [CBUUID: (Bool, ArrayBuffer, BLENativeError?) -> Void] = [:]
    var subscriptionCallbacks: [CBUUID: (Bool, BLENativeError?) -> Void] = [:]
    var unsubscriptionCallbacks: [CBUUID: (Bool, BLENativeError?) -> Void] = [:]
    
    // Store written data for comparison
    var writtenData: [CBUUID: Data] = [:]
    
    // Notification callbacks
    var notificationCallbacks: [CBUUID: (String, ArrayBuffer) -> Void] = [:]
    
    // MARK: - Initialization
    init(deviceId: String, manager: BleNitroBleManager) {
        self.deviceId = deviceId
        self.manager = manager
        super.init()
    }
    
    // MARK: - CBPeripheralDelegate - Service Discovery
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            let bleError = nativeError(from: error)
            serviceDiscoveryCallback?(false, bleError)
            serviceDiscoveryCallback = nil
            resolveFullDiscoveryCallbacks(success: false, error: bleError)
            return
        }

        servicesDiscovered = true

        // Resolve service-only callback immediately
        serviceDiscoveryCallback?(true, nil)
        serviceDiscoveryCallback = nil

        // Trigger characteristic discovery only for services that still need it.
        // CoreBluetooth may skip the didDiscoverCharacteristicsFor callback for
        // services whose characteristics are already cached, which would leave the
        // counter stuck below expectedCharacteristicsCount.
        let services = peripheral.services ?? []
        let undiscovered = services.filter { $0.characteristics == nil }

        if undiscovered.isEmpty {
            resolveFullDiscoveryCallbacks(success: true, error: nil)
        } else {
            expectedCharacteristicsCount = undiscovered.count
            characteristicsDiscoveredCount = 0
            characteristicDiscoveryError = nil
            for service in undiscovered {
                peripheral.discoverCharacteristics(nil, for: service)
            }
        }
    }
    
    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        let serviceId = service.uuid.uuidString

        if let error = error {
            let nsError = error as NSError
            characteristicDiscoveryCallbacks[serviceId]?(false, nativeError(from: error))
            // Record the first error for the full discovery callback
            if characteristicDiscoveryError == nil {
                characteristicDiscoveryError = BLENativeError(
                    domain: nsError.domain,
                    code: Double(nsError.code),
                    message: "Characteristic discovery failed for service \(serviceId): \(error.localizedDescription)",
                    libraryCode: nil
                )
            }
        } else {
            characteristicDiscoveryCallbacks[serviceId]?(true, nil)
        }
        characteristicDiscoveryCallbacks.removeValue(forKey: serviceId)

        // Track full discovery progress
        characteristicsDiscoveredCount += 1
        if characteristicsDiscoveredCount >= expectedCharacteristicsCount {
            if let discoveryError = characteristicDiscoveryError {
                resolveFullDiscoveryCallbacks(success: false, error: discoveryError)
            } else {
                resolveFullDiscoveryCallbacks(success: true, error: nil)
            }
        }
    }
    
    // MARK: - CBPeripheralDelegate - Characteristic Read
    func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        let characteristicUUID = characteristic.uuid
        
        // Handle read callback using CBUUID - no normalization needed
        if let readCallback = readCallbacks[characteristicUUID] {
            if let error = error {
                let bleError = nativeError(from: error)
                do {
                    let emptyData = Data(capacity: 0)
                    let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                    readCallback(false, emptyBuffer, bleError)
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, bleError)
                }
            } else if let data = characteristic.value {
                do {
                    let capacityData = Data(capacity: data.count)
                    let finalData = capacityData + data
                    let arrayBuffer = try ArrayBuffer.copy(data: finalData)
                    readCallback(true, arrayBuffer, nil)
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, libraryError(BleNitroLibraryErrorCode.dataError, "Failed to create ArrayBuffer"))
                }
            } else {
                do {
                    let emptyData = Data(capacity: 0)
                    let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                    readCallback(false, emptyBuffer, libraryError(BleNitroLibraryErrorCode.dataError, "No data received"))
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, libraryError(BleNitroLibraryErrorCode.dataError, "No data received"))
                }
            }
            readCallbacks.removeValue(forKey: characteristicUUID)
        }
        
        // Handle notification callback using CBUUID
        if let notificationCallback = notificationCallbacks[characteristicUUID],
           let data = characteristic.value {
            do {
                let capacityData = Data(capacity: data.count)
                let finalData = capacityData + data
                let arrayBuffer = try ArrayBuffer.copy(data: finalData)
                notificationCallback(characteristicUUID.uuidString, arrayBuffer)
            } catch {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                notificationCallback(characteristicUUID.uuidString, emptyBuffer)
            }
        }
    }
    
    // MARK: - CBPeripheralDelegate - Characteristic Write
    func peripheral(
        _ peripheral: CBPeripheral,
        didWriteValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        let characteristicUUID = characteristic.uuid
        
        // Handle write callback using CBUUID
        if let writeCallback = writeCallbacks[characteristicUUID] {
            if let error = error {
                let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                writeCallback(false, emptyBuffer, nativeError(from: error))
            } else {
                // For write operations in iOS, didWriteValueFor indicates successful acknowledgment
                // Check if characteristic value was updated (may contain response data or written data)
                let responseData = characteristic.value ?? Data()
                let responseBuffer = try! ArrayBuffer.copy(data: responseData)
                writeCallback(true, responseBuffer, nil)
            }
            writeCallbacks.removeValue(forKey: characteristicUUID)
            writtenData.removeValue(forKey: characteristicUUID)
        }
    }
    
    // MARK: - CBPeripheralDelegate - RSSI
    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if let rssiCallback = rssiCallback {
            if let error = error {
                rssiCallback(false, 0.0, nativeError(from: error))
            } else {
                rssiCallback(true, RSSI.doubleValue, nil)
            }
            self.rssiCallback = nil // Clear callback after use
        }
    }
    
    // MARK: - CBPeripheralDelegate - Notifications
    func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateNotificationStateFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        let characteristicUUID = characteristic.uuid
        
        // Handle subscription callback using CBUUID
        if let subscriptionCallback = subscriptionCallbacks[characteristicUUID] {
            if let error = error {
                subscriptionCallback(false, nativeError(from: error))
            } else {
                subscriptionCallback(characteristic.isNotifying, nil)
            }
            subscriptionCallbacks.removeValue(forKey: characteristicUUID)
        }
        
        // Handle unsubscription callback using CBUUID
        if let unsubscriptionCallback = unsubscriptionCallbacks[characteristicUUID] {
            if let error = error {
                unsubscriptionCallback(false, nativeError(from: error))
            } else {
                unsubscriptionCallback(!characteristic.isNotifying, nil)
            }
            unsubscriptionCallbacks.removeValue(forKey: characteristicUUID)
        }
    }
    
    // MARK: - CBPeripheralDelegate - Connection Events
    
    func peripheral(_ peripheral: CBPeripheral, didModifyServices invalidatedServices: [CBService]) {
        resolveFullDiscoveryCallbacks(success: false, error: libraryError(BleNitroLibraryErrorCode.disconnectedDuringOperation, "Services were invalidated during discovery"))
        servicesDiscovered = false
        characteristicsDiscoveredCount = 0
        expectedCharacteristicsCount = 0
        characteristicDiscoveryError = nil
    }
    
    // MARK: - Full Discovery Helpers

    private func resolveFullDiscoveryCallbacks(success: Bool, error: BLENativeError?) {
        let callbacks = fullDiscoveryCallbacks
        fullDiscoveryCallbacks.removeAll()
        for callback in callbacks {
            callback(success, error)
        }
    }

    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
        // Handle write without response ready state
        // Can be used to implement queuing for write operations
    }
    
    // MARK: - Cleanup
    func cleanup() {
        // Reject in-flight discovery callbacks before clearing
        resolveFullDiscoveryCallbacks(success: false, error: libraryError(BleNitroLibraryErrorCode.disconnectedDuringOperation, "Peripheral disconnected during discovery"))
        // Clear all callbacks to prevent memory leaks
        connectionCallback = nil
        disconnectionCallback = nil
        disconnectEventCallback = nil
        serviceDiscoveryCallback = nil
        servicesDiscovered = false
        characteristicsDiscoveredCount = 0
        expectedCharacteristicsCount = 0
        characteristicDiscoveryError = nil
        characteristicDiscoveryCallbacks.removeAll()
        rssiCallback = nil
        readCallbacks.removeAll()
        writeCallbacks.removeAll()
        writtenData.removeAll()
        subscriptionCallbacks.removeAll()
        unsubscriptionCallbacks.removeAll()
        notificationCallbacks.removeAll()
    }
}