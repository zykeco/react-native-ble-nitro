import CoreBluetooth
import Foundation
import NitroModules

struct BleNitroGattServerConfiguration {
    struct Characteristic {
        let uuid: String
        let properties: Int
        let permissions: Int
        let value: Data
    }

    struct Service {
        let uuid: String
        let primary: Bool
        let characteristics: [Characteristic]
    }

    struct Advertising {
        let enabled: Bool
        let serviceUUIDs: [String]
        let localName: String
    }

    let services: [Service]
    let advertising: Advertising

    init(options: GattServerOptions) {
        services = options.services.map { service in
            Service(
                uuid: service.uuid,
                primary: service.primary,
                characteristics: service.characteristics.map { characteristic in
                    Characteristic(
                        uuid: characteristic.uuid,
                        properties: Int(characteristic.properties),
                        permissions: Int(characteristic.permissions),
                        value: characteristic.value.toData(copyIfNeeded: true)
                    )
                }
            )
        }

        let nativeAdvertising = options.advertising
        advertising = Advertising(
            enabled: nativeAdvertising.enabled,
            serviceUUIDs: nativeAdvertising.serviceUUIDs,
            localName: nativeAdvertising.localName
        )
    }
}

final class BleNitroGattServer: NSObject {
    private let eventCallback: (GattServerEvent) -> Void
    private var peripheralManager: CBPeripheralManager!
    private var startCallback: ((Bool, String) -> Void)?
    private var options: BleNitroGattServerConfiguration?
    private var pendingServiceAdds = 0
    private var pendingStart = false
    private var advertising = false
    private var running = false

    private var characteristicsByKey: [String: CBMutableCharacteristic] = [:]
    private var characteristicValues: [String: Data] = [:]
    private var connectedCentrals: [UUID: CBCentral] = [:]
    private var subscriptions: Set<String> = []
    private var pendingNotifications: [PendingNotification] = []

    private struct PendingNotification {
        let deviceId: String
        let serviceId: String
        let characteristicId: String
        let value: Data
        let callback: (Bool, [String], String) -> Void
    }

    init(eventCallback: @escaping (GattServerEvent) -> Void) {
        self.eventCallback = eventCallback
        super.init()
        self.peripheralManager = CBPeripheralManager(delegate: self, queue: DispatchQueue.main)
    }

    func start(
        options: BleNitroGattServerConfiguration,
        callback: @escaping (Bool, String) -> Void
    ) {
        stop(emitEvent: false)
        self.options = options
        self.startCallback = callback
        self.pendingStart = false
        self.characteristicsByKey.removeAll()
        self.characteristicValues.removeAll()

        switch peripheralManager.state {
        case .poweredOn:
            addConfiguredServices()
        case .unknown, .resetting:
            pendingStart = true
        case .poweredOff:
            finishStart(false, "Bluetooth is not powered on")
        case .unauthorized:
            finishStart(false, "Bluetooth permission is not granted")
        case .unsupported:
            finishStart(false, "BLE peripheral mode is not supported")
        @unknown default:
            finishStart(false, "Unknown Bluetooth state")
        }
    }

    func stop(emitEvent: Bool = true) {
        if peripheralManager?.state == .poweredOn {
            if peripheralManager.isAdvertising {
                peripheralManager.stopAdvertising()
            }
            peripheralManager.removeAllServices()
        }
        let shouldEmit = emitEvent && advertising
        startCallback = nil
        pendingStart = false
        pendingServiceAdds = 0
        options = nil
        advertising = false
        running = false
        characteristicsByKey.removeAll()
        characteristicValues.removeAll()
        connectedCentrals.removeAll()
        subscriptions.removeAll()
        let notifications = pendingNotifications
        pendingNotifications.removeAll()
        for notification in notifications {
            notification.callback(
                false,
                [],
                "GATT server stopped before the notification could be queued"
            )
        }
        if shouldEmit {
            emit(.advertisingstopped)
        }
    }

    func isRunning() -> Bool {
        return running && peripheralManager?.state == .poweredOn
    }

    func isAdvertising() -> Bool {
        return advertising
            && peripheralManager?.state == .poweredOn
            && peripheralManager?.isAdvertising == true
    }

    func getConnectedDevices() -> [String] {
        return connectedCentrals.keys.map { $0.uuidString }
    }

    func getDeviceMtu(deviceId: String) -> Double {
        guard let id = UUID(uuidString: deviceId), let central = connectedCentrals[id] else {
            return 0.0
        }
        return Double(central.maximumUpdateValueLength)
    }

    func setCharacteristicValue(
        serviceId: String,
        characteristicId: String,
        value: Data
    ) -> Bool {
        let key = characteristicKey(serviceId: serviceId, characteristicId: characteristicId)
        guard let characteristic = characteristicsByKey[key] else {
            return false
        }
        characteristicValues[key] = value
        if characteristic.properties.isDisjoint(with: [.notify, .indicate]) {
            characteristic.value = value
        }
        return true
    }

    func notifyCharacteristicChanged(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        value: Data,
        callback: @escaping (Bool, [String], String) -> Void
    ) {
        let notification = PendingNotification(
            deviceId: deviceId,
            serviceId: serviceId,
            characteristicId: characteristicId,
            value: value,
            callback: callback
        )
        if !send(notification) {
            pendingNotifications.append(notification)
        }
    }

    /// Returns false only when CoreBluetooth's transmit queue is full.
    private func send(_ notification: PendingNotification) -> Bool {
        let key = characteristicKey(
            serviceId: notification.serviceId,
            characteristicId: notification.characteristicId
        )
        guard let characteristic = characteristicsByKey[key] else {
            notification.callback(false, [], "Characteristic not found")
            return true
        }

        characteristicValues[key] = notification.value

        let targets: [CBCentral]
        if notification.deviceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            targets = connectedCentrals.values.filter {
                subscriptions.contains(subscriptionKey($0.identifier, key))
            }
        } else if
            let id = UUID(uuidString: notification.deviceId),
            let central = connectedCentrals[id]
        {
            guard subscriptions.contains(subscriptionKey(id, key)) else {
                notification.callback(true, [], "")
                return true
            }
            targets = [central]
        } else {
            notification.callback(
                false,
                [],
                "Device \(notification.deviceId) is not connected"
            )
            return true
        }

        guard !targets.isEmpty else {
            notification.callback(true, [], "")
            return true
        }

        guard peripheralManager.state == .poweredOn else {
            notification.callback(false, [], "Bluetooth is not powered on")
            return true
        }

        guard peripheralManager.updateValue(
            notification.value,
            for: characteristic,
            onSubscribedCentrals: targets
        ) else {
            return false
        }

        notification.callback(
            true,
            targets.map { $0.identifier.uuidString },
            ""
        )
        return true
    }

    func disconnectDevice(deviceId: String) -> (Bool, String) {
        return (false, "iOS does not support disconnecting a central from peripheral mode")
    }

    private func addConfiguredServices() {
        guard let options else {
            finishStart(false, "GATT server options are missing")
            return
        }

        guard peripheralManager.state == .poweredOn else {
            if peripheralManager.state == .unknown || peripheralManager.state == .resetting {
                pendingStart = true
            } else {
                finishStart(false, startError(for: peripheralManager.state))
            }
            return
        }

        pendingStart = false
        peripheralManager.removeAllServices()
        pendingServiceAdds = options.services.count

        guard pendingServiceAdds > 0 else {
            finishStart(false, "At least one GATT service is required")
            return
        }

        for serviceConfig in options.services {
            peripheralManager.add(createService(serviceConfig))
        }
    }

    private func createService(
        _ serviceConfig: BleNitroGattServerConfiguration.Service
    ) -> CBMutableService {
        let service = CBMutableService(
            type: CBUUID(string: serviceConfig.uuid),
            primary: serviceConfig.primary
        )

        service.characteristics = serviceConfig.characteristics.map { characteristicConfig in
            let properties = cbProperties(characteristicConfig.properties)
            let permissions = cbPermissions(characteristicConfig.permissions)
            let characteristic = CBMutableCharacteristic(
                type: CBUUID(string: characteristicConfig.uuid),
                properties: properties,
                value: nil,
                permissions: permissions
            )
            let key = characteristicKey(
                serviceId: serviceConfig.uuid,
                characteristicId: characteristicConfig.uuid
            )
            characteristicsByKey[key] = characteristic
            characteristicValues[key] = characteristicConfig.value
            return characteristic
        }

        return service
    }

    private func startAdvertising() {
        guard let options else {
            finishStart(false, "GATT server options are missing")
            return
        }

        guard peripheralManager.state == .poweredOn else {
            finishStart(false, startError(for: peripheralManager.state))
            return
        }

        let advertisingOptions = options.advertising
        guard advertisingOptions.enabled else {
            running = true
            finishStart(true, "")
            return
        }

        var advertisement: [String: Any] = [:]
        let serviceUUIDs = advertisingOptions.serviceUUIDs.map { CBUUID(string: $0) }
        if !serviceUUIDs.isEmpty {
            advertisement[CBAdvertisementDataServiceUUIDsKey] = serviceUUIDs
        }
        if !advertisingOptions.localName.isEmpty {
            advertisement[CBAdvertisementDataLocalNameKey] = advertisingOptions.localName
        }

        peripheralManager.startAdvertising(advertisement)
    }

    private func registerCentral(_ central: CBCentral) {
        if connectedCentrals[central.identifier] == nil {
            connectedCentrals[central.identifier] = central
            emit(.deviceconnected, deviceId: central.identifier.uuidString)
        }
    }

    private func finishStart(_ success: Bool, _ error: String) {
        let callback = startCallback
        startCallback = nil
        callback?(success, error)
    }

    private func startError(for state: CBManagerState) -> String {
        switch state {
        case .poweredOff:
            return "Bluetooth is not powered on"
        case .unauthorized:
            return "Bluetooth permission is not granted"
        case .unsupported:
            return "BLE peripheral mode is not supported"
        case .unknown, .resetting:
            return "Bluetooth state is not ready"
        case .poweredOn:
            return ""
        @unknown default:
            return "Unknown Bluetooth state"
        }
    }

    private func cbProperties(_ flags: Int) -> CBCharacteristicProperties {
        var properties: CBCharacteristicProperties = []
        if flags & 1 != 0 { properties.insert(.broadcast) }
        if flags & 2 != 0 { properties.insert(.read) }
        if flags & 4 != 0 { properties.insert(.writeWithoutResponse) }
        if flags & 8 != 0 { properties.insert(.write) }
        if flags & 16 != 0 { properties.insert(.notify) }
        if flags & 32 != 0 { properties.insert(.indicate) }
        if flags & 64 != 0 { properties.insert(.authenticatedSignedWrites) }
        return properties
    }

    private func cbPermissions(_ flags: Int) -> CBAttributePermissions {
        var permissions: CBAttributePermissions = []
        if flags & 1 != 0 { permissions.insert(.readable) }
        if flags & 2 != 0 { permissions.insert(.writeable) }
        if flags & 4 != 0 || flags & 8 != 0 {
            permissions.insert(.readEncryptionRequired)
        }
        if flags & 16 != 0 || flags & 32 != 0 || flags & 64 != 0 || flags & 128 != 0 {
            permissions.insert(.writeEncryptionRequired)
        }
        return permissions
    }

    private func emit(
        _ type: NativeGattServerEventType,
        deviceId: String = "",
        serviceId: String = "",
        characteristicId: String = "",
        descriptorId: String = "",
        data: Data = Data(),
        isSubscribed: Bool = false,
        mtu: Int = 0,
        error: String = ""
    ) {
        let resolvedMtu: Int
        if mtu > 0 {
            resolvedMtu = mtu
        } else if let id = UUID(uuidString: deviceId), let central = connectedCentrals[id] {
            resolvedMtu = central.maximumUpdateValueLength
        } else {
            resolvedMtu = 0
        }
        let buffer = (try? ArrayBuffer.copy(data: data)) ?? ArrayBuffer.allocate(size: 0)
        eventCallback(
            GattServerEvent(
                type: type,
                deviceId: deviceId,
                serviceId: serviceId,
                characteristicId: characteristicId,
                descriptorId: descriptorId,
                data: buffer,
                isSubscribed: isSubscribed,
                mtu: Double(resolvedMtu),
                error: error
            )
        )
    }

    private func emitError(
        _ error: String,
        deviceId: String = "",
        serviceId: String = "",
        characteristicId: String = ""
    ) {
        emit(
            .error,
            deviceId: deviceId,
            serviceId: serviceId,
            characteristicId: characteristicId,
            error: error
        )
    }

    private func characteristicKey(serviceId: String, characteristicId: String) -> String {
        return "\(serviceId.lowercased()):\(characteristicId.lowercased())"
    }

    private func characteristicKey(for characteristic: CBCharacteristic) -> String? {
        guard let serviceId = characteristic.service?.uuid.uuidString else {
            return nil
        }
        return characteristicKey(
            serviceId: serviceId,
            characteristicId: characteristic.uuid.uuidString
        )
    }

    private func subscriptionKey(_ centralId: UUID, _ characteristicKey: String) -> String {
        return "\(centralId.uuidString.lowercased()):\(characteristicKey)"
    }
}

extension BleNitroGattServer: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if pendingStart {
            if peripheral.state == .poweredOn {
                pendingStart = false
                addConfiguredServices()
            } else if peripheral.state != .unknown && peripheral.state != .resetting {
                pendingStart = false
                finishStart(false, startError(for: peripheral.state))
            }
            return
        }

        if startCallback != nil && peripheral.state != .poweredOn {
            let error = startError(for: peripheral.state)
            finishStart(false, error)
            stop(emitEvent: false)
            return
        }

        if (running || advertising) && peripheral.state != .poweredOn {
            emitError(startError(for: peripheral.state))
            stop()
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error {
            emitError("Failed to add GATT service \(service.uuid.uuidString): \(error.localizedDescription)")
            finishStart(false, error.localizedDescription)
            stop(emitEvent: false)
            return
        }

        pendingServiceAdds -= 1
        if pendingServiceAdds == 0 {
            startAdvertising()
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error {
            advertising = false
            emitError(error.localizedDescription)
            finishStart(false, error.localizedDescription)
            stop(emitEvent: false)
            return
        }

        advertising = true
        running = true
        emit(.advertisingstarted)
        finishStart(true, "")
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didSubscribeTo characteristic: CBCharacteristic
    ) {
        registerCentral(central)
        guard let key = characteristicKey(for: characteristic) else { return }
        subscriptions.insert(subscriptionKey(central.identifier, key))
        emit(
            .notificationsubscribed,
            deviceId: central.identifier.uuidString,
            serviceId: characteristic.service?.uuid.uuidString ?? "",
            characteristicId: characteristic.uuid.uuidString,
            isSubscribed: true
        )
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didUnsubscribeFrom characteristic: CBCharacteristic
    ) {
        guard let key = characteristicKey(for: characteristic) else { return }
        subscriptions.remove(subscriptionKey(central.identifier, key))
        emit(
            .notificationunsubscribed,
            deviceId: central.identifier.uuidString,
            serviceId: characteristic.service?.uuid.uuidString ?? "",
            characteristicId: characteristic.uuid.uuidString,
            isSubscribed: false
        )

        let stillSubscribed = subscriptions.contains { entry in
            entry.hasPrefix(central.identifier.uuidString.lowercased() + ":")
        }
        if !stillSubscribed {
            let mtu = central.maximumUpdateValueLength
            connectedCentrals.removeValue(forKey: central.identifier)
            emit(.devicedisconnected, deviceId: central.identifier.uuidString, mtu: mtu)
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        registerCentral(request.central)
        guard let key = characteristicKey(for: request.characteristic) else {
            peripheral.respond(to: request, withResult: .attributeNotFound)
            return
        }

        let value = characteristicValues[key] ?? Data()
        guard request.offset <= value.count else {
            peripheral.respond(to: request, withResult: .invalidOffset)
            return
        }

        request.value = value.subdata(in: request.offset..<value.count)
        peripheral.respond(to: request, withResult: .success)
        emit(
            .characteristicread,
            deviceId: request.central.identifier.uuidString,
            serviceId: request.characteristic.service?.uuid.uuidString ?? "",
            characteristicId: request.characteristic.uuid.uuidString,
            data: value
        )
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        guard let firstRequest = requests.first else { return }

        var stagedValues = characteristicValues
        var acceptedWrites: [(request: CBATTRequest, key: String, value: Data)] = []

        for request in requests {
            registerCentral(request.central)
            guard let key = characteristicKey(for: request.characteristic) else {
                peripheral.respond(to: firstRequest, withResult: .attributeNotFound)
                return
            }

            guard let incoming = request.value else {
                peripheral.respond(to: firstRequest, withResult: .invalidAttributeValueLength)
                return
            }

            let current = stagedValues[key] ?? Data()
            if request.offset > current.count {
                peripheral.respond(to: firstRequest, withResult: .invalidOffset)
                return
            }

            var next = Data()
            if request.offset > 0 {
                next.append(current.prefix(request.offset))
            }
            next.append(incoming)
            stagedValues[key] = next
            acceptedWrites.append((request, key, next))
        }

        for write in acceptedWrites {
            characteristicValues[write.key] = write.value
        }
        peripheral.respond(to: firstRequest, withResult: .success)

        for write in acceptedWrites {
            emit(
                .characteristicwrite,
                deviceId: write.request.central.identifier.uuidString,
                serviceId: write.request.characteristic.service?.uuid.uuidString ?? "",
                characteristicId: write.request.characteristic.uuid.uuidString,
                data: write.value
            )
        }
    }

    func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        while !pendingNotifications.isEmpty {
            let notification = pendingNotifications.removeFirst()
            if !send(notification) {
                pendingNotifications.insert(notification, at: 0)
                return
            }
        }
    }
}
