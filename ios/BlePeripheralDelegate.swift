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
    
    // Operation callbacks - using CBUUID as key for reliable UUID matching
    var readCallbacks: [CBUUID: (Bool, ArrayBuffer, String) -> Void] = [:]
    var writeCallbacks: [CBUUID: (Bool, ArrayBuffer, String) -> Void] = [:]
    var subscriptionCallbacks: [CBUUID: (Bool, String) -> Void] = [:]
    var unsubscriptionCallbacks: [CBUUID: (Bool, String) -> Void] = [:]
    
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
        } else {
            serviceDiscoveryCallback?(true, "")
            
            // Automatically discover characteristics for all services
            peripheral.services?.forEach { service in
                peripheral.discoverCharacteristics(nil, for: service)
            }
        }
        serviceDiscoveryCallback = nil
    }
    
    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        let serviceId = service.uuid.uuidString
        
        if let error = error {
            characteristicDiscoveryCallbacks[serviceId]?(false, error.localizedDescription)
        } else {
            characteristicDiscoveryCallbacks[serviceId]?(true, "")
        }
        characteristicDiscoveryCallbacks.removeValue(forKey: serviceId)
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
                // For write operations, get the response data from characteristic value if available
                let responseData = characteristic.value ?? Data()
                let responseBuffer = try! ArrayBuffer.copy(data: responseData)
                writeCallback(true, responseBuffer, "")
            }
            writeCallbacks.removeValue(forKey: characteristicUUID)
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
    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        // Optional: Handle RSSI updates if needed
    }
    
    func peripheral(_ peripheral: CBPeripheral, didModifyServices invalidatedServices: [CBService]) {
        // Handle service modifications
        // This might require re-discovery of services
    }
    
    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
        // Handle write without response ready state
        // Can be used to implement queuing for write operations
    }
    
    // MARK: - Cleanup
    func cleanup() {
        // Clear all callbacks to prevent memory leaks
        connectionCallback = nil
        disconnectionCallback = nil
        disconnectEventCallback = nil
        serviceDiscoveryCallback = nil
        characteristicDiscoveryCallbacks.removeAll()
        readCallbacks.removeAll()
        writeCallbacks.removeAll()
        subscriptionCallbacks.removeAll()
        unsubscriptionCallbacks.removeAll()
        notificationCallbacks.removeAll()
    }
}