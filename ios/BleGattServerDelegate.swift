import Foundation
import CoreBluetooth

/**
 * Delegate for CBPeripheralManager events
 * Forwards all peripheral manager callbacks to BleNitroBleManager
 */
class BleGattServerDelegate: NSObject, CBPeripheralManagerDelegate {

    // MARK: - Properties
    weak var manager: BleNitroBleManager?

    // MARK: - Initialization
    init(manager: BleNitroBleManager) {
        self.manager = manager
        super.init()
    }

    // MARK: - CBPeripheralManagerDelegate

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        guard let manager = manager else { return }
        // CBPeripheralManager.state is CBPeripheralManagerState but maps to same raw values as CBManagerState
        let cbState = CBManagerState(rawValue: peripheral.state.rawValue) ?? .unknown
        let bleState = manager.mapCBManagerStateToBLEState(cbState)
        manager.handlePeripheralStateChange(bleState)
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        manager?.handleAdvertisingStarted(error: error)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error = error {
            print("[BleNitro] Failed to add service \(service.uuid.uuidString): \(error.localizedDescription)")
        } else {
            print("[BleNitro] Successfully added service \(service.uuid.uuidString)")
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        manager?.handleReadRequest(request)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        manager?.handleWriteRequests(requests)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        manager?.handleCentralSubscribed(central: central, characteristic: characteristic)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        manager?.handleCentralUnsubscribed(central: central, characteristic: characteristic)
    }
}
