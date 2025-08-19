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
    var serviceDiscoveryCallback: ((Bool, String) -> Void)?
    var characteristicDiscoveryCallbacks: [String: (Bool, String) -> Void] = [:]
    
    // Operation callbacks
    var readCallbacks: [String: (Bool, String) -> Void] = [:]
    var writeCallbacks: [String: (Bool, String) -> Void] = [:]
    var subscriptionCallbacks: [String: (Bool, String) -> Void] = [:]
    var unsubscriptionCallbacks: [String: (Bool, String) -> Void] = [:]
    
    // Notification callbacks
    var notificationCallbacks: [String: (String, [Double]) -> Void] = [:]
    
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
        let characteristicId = characteristic.uuid.uuidString
        
        // Handle read callback
        if let readCallback = readCallbacks[characteristicId] {
            if let error = error {
                readCallback(false, error.localizedDescription)
            } else {
                readCallback(true, "")
            }
            readCallbacks.removeValue(forKey: characteristicId)
        }
        
        // Handle notification callback
        if let notificationCallback = notificationCallbacks[characteristicId],
           let data = characteristic.value {
            let doubleArray = data.map { Double($0) }
            notificationCallback(characteristicId, doubleArray)
        }
    }
    
    // MARK: - CBPeripheralDelegate - Characteristic Write
    func peripheral(
        _ peripheral: CBPeripheral,
        didWriteValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        let characteristicId = characteristic.uuid.uuidString
        
        if let writeCallback = writeCallbacks[characteristicId] {
            if let error = error {
                writeCallback(false, error.localizedDescription)
            } else {
                writeCallback(true, "")
            }
            writeCallbacks.removeValue(forKey: characteristicId)
        }
    }
    
    // MARK: - CBPeripheralDelegate - Notifications
    func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateNotificationStateFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        let characteristicId = characteristic.uuid.uuidString
        
        // Handle subscription callback
        if let subscriptionCallback = subscriptionCallbacks[characteristicId] {
            if let error = error {
                subscriptionCallback(false, error.localizedDescription)
            } else {
                subscriptionCallback(characteristic.isNotifying, "")
            }
            subscriptionCallbacks.removeValue(forKey: characteristicId)
        }
        
        // Handle unsubscription callback
        if let unsubscriptionCallback = unsubscriptionCallbacks[characteristicId] {
            if let error = error {
                unsubscriptionCallback(false, error.localizedDescription)
            } else {
                unsubscriptionCallback(!characteristic.isNotifying, "")
            }
            unsubscriptionCallbacks.removeValue(forKey: characteristicId)
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
        serviceDiscoveryCallback = nil
        characteristicDiscoveryCallbacks.removeAll()
        readCallbacks.removeAll()
        writeCallbacks.removeAll()
        subscriptionCallbacks.removeAll()
        unsubscriptionCallbacks.removeAll()
        notificationCallbacks.removeAll()
    }
}