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
    var connectionCallback: ((Bool, String, String) -> Void)?
    var disconnectionCallback: ((Bool, String) -> Void)?
    var disconnectEventCallback: ((String, Bool, String) -> Void)?
    var serviceDiscoveryCallback: ((Bool, String) -> Void)?
    var characteristicDiscoveryCallbacks: [String: (Bool, String) -> Void] = [:]

    // Full discovery (services + characteristics) callbacks and state
    var fullDiscoveryCallbacks: [(Bool, String) -> Void] = []
    var servicesDiscovered = false
    var characteristicsDiscoveredCount = 0
    var expectedCharacteristicsCount = 0
    var characteristicDiscoveryError: String?

    // RSSI callback
    var rssiCallback: ((Bool, Double, String) -> Void)?
    
    // Operation callbacks - using CBUUID as key for reliable UUID matching
    var readCallbacks: [CBUUID: (Bool, ArrayBuffer, String) -> Void] = [:]
    var writeCallbacks: [CBUUID: (Bool, ArrayBuffer, String) -> Void] = [:]
    var subscriptionCallbacks: [CBUUID: (Bool, String) -> Void] = [:]
    var unsubscriptionCallbacks: [CBUUID: (Bool, String) -> Void] = [:]
    
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
            serviceDiscoveryCallback?(false, error.localizedDescription)
            serviceDiscoveryCallback = nil
            resolveFullDiscoveryCallbacks(success: false, error: error.localizedDescription)
            return
        }

        servicesDiscovered = true

        // Resolve service-only callback immediately
        serviceDiscoveryCallback?(true, "")
        serviceDiscoveryCallback = nil

        // Trigger characteristic discovery only for services that still need it.
        // CoreBluetooth may skip the didDiscoverCharacteristicsFor callback for
        // services whose characteristics are already cached, which would leave the
        // counter stuck below expectedCharacteristicsCount.
        let services = peripheral.services ?? []
        let undiscovered = services.filter { $0.characteristics == nil }

        if undiscovered.isEmpty {
            resolveFullDiscoveryCallbacks(success: true, error: "")
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
            characteristicDiscoveryCallbacks[serviceId]?(false, error.localizedDescription)
            // Record the first error for the full discovery callback
            if characteristicDiscoveryError == nil {
                characteristicDiscoveryError = "Characteristic discovery failed for service \(serviceId): \(error.localizedDescription)"
            }
        } else {
            characteristicDiscoveryCallbacks[serviceId]?(true, "")
        }
        characteristicDiscoveryCallbacks.removeValue(forKey: serviceId)

        // Track full discovery progress
        characteristicsDiscoveredCount += 1
        if characteristicsDiscoveredCount >= expectedCharacteristicsCount {
            if let discoveryError = characteristicDiscoveryError {
                resolveFullDiscoveryCallbacks(success: false, error: discoveryError)
            } else {
                resolveFullDiscoveryCallbacks(success: true, error: "")
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
                do {
                    let emptyData = Data(capacity: 0)
                    let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                    readCallback(false, emptyBuffer, error.localizedDescription)
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, error.localizedDescription)
                }
            } else if let data = characteristic.value {
                do {
                    let capacityData = Data(capacity: data.count)
                    let finalData = capacityData + data
                    let arrayBuffer = try ArrayBuffer.copy(data: finalData)
                    readCallback(true, arrayBuffer, "")
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, "Failed to create ArrayBuffer")
                }
            } else {
                do {
                    let emptyData = Data(capacity: 0)
                    let emptyBuffer = try ArrayBuffer.copy(data: emptyData)
                    readCallback(false, emptyBuffer, "No data received")
                } catch {
                    let emptyBuffer = try! ArrayBuffer.copy(data: Data())
                    readCallback(false, emptyBuffer, "No data received")
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
                writeCallback(false, emptyBuffer, error.localizedDescription)
            } else {
                // For write operations in iOS, didWriteValueFor indicates successful acknowledgment
                // Check if characteristic value was updated (may contain response data or written data)
                let responseData = characteristic.value ?? Data()
                let responseBuffer = try! ArrayBuffer.copy(data: responseData)
                writeCallback(true, responseBuffer, "")
            }
            writeCallbacks.removeValue(forKey: characteristicUUID)
            writtenData.removeValue(forKey: characteristicUUID)
        }
    }
    
    // MARK: - CBPeripheralDelegate - RSSI
    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if let rssiCallback = rssiCallback {
            if let error = error {
                rssiCallback(false, 0.0, error.localizedDescription)
            } else {
                rssiCallback(true, RSSI.doubleValue, "")
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
                subscriptionCallback(false, error.localizedDescription)
            } else {
                subscriptionCallback(characteristic.isNotifying, "")
            }
            subscriptionCallbacks.removeValue(forKey: characteristicUUID)
        }
        
        // Handle unsubscription callback using CBUUID
        if let unsubscriptionCallback = unsubscriptionCallbacks[characteristicUUID] {
            if let error = error {
                unsubscriptionCallback(false, error.localizedDescription)
            } else {
                unsubscriptionCallback(!characteristic.isNotifying, "")
            }
            unsubscriptionCallbacks.removeValue(forKey: characteristicUUID)
        }
    }
    
    // MARK: - CBPeripheralDelegate - Connection Events
    
    func peripheral(_ peripheral: CBPeripheral, didModifyServices invalidatedServices: [CBService]) {
        resolveFullDiscoveryCallbacks(success: false, error: "Services were invalidated during discovery")
        servicesDiscovered = false
        characteristicsDiscoveredCount = 0
        expectedCharacteristicsCount = 0
        characteristicDiscoveryError = nil
    }
    
    // MARK: - Full Discovery Helpers

    private func resolveFullDiscoveryCallbacks(success: Bool, error: String) {
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
        resolveFullDiscoveryCallbacks(success: false, error: "Peripheral disconnected during discovery")
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