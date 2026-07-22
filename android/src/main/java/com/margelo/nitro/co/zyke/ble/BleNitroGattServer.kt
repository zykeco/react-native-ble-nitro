package com.margelo.nitro.co.zyke.ble

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import androidx.core.content.ContextCompat
import com.margelo.nitro.core.ArrayBuffer
import java.util.Arrays
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

internal class BleNitroGattServer(
    private val context: Context,
    private val eventCallback: (GattServerEvent) -> Unit
) {
    private val bluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter

    private var gattServer: BluetoothGattServer? = null
    private var startCallback: ((Boolean, String) -> Unit)? = null
    private var pendingServiceAdds = 0
    private var advertising = false
    private var running = false
    private var options: GattServerOptions? = null
    private var bluetoothStateReceiverRegistered = false
    private var originalBluetoothName: String? = null
    private var pendingBluetoothName: String? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private val bluetoothNameChangeTimeout = Runnable {
        val expectedName = pendingBluetoothName ?: return@Runnable
        clearPendingBluetoothNameChange()
        val currentName = runCatching { bluetoothAdapter?.name }.getOrNull()
        if (currentName == expectedName) {
            startAdvertising()
        } else {
            val reason = "Bluetooth device name did not change to $expectedName"
            emitError(reason)
            finishStart(false, reason)
            stop()
        }
    }

    private val characteristicsByKey =
        ConcurrentHashMap<String, BluetoothGattCharacteristic>()
    private val characteristicValues = ConcurrentHashMap<String, ByteArray>()
    private val connectedDevices = ConcurrentHashMap<String, BluetoothDevice>()
    private val deviceMtus = ConcurrentHashMap<String, Int>()
    private val subscribedCharacteristicKeysByDevice =
        ConcurrentHashMap<String, MutableSet<String>>()
    private val inFlightNotificationsByDevice =
        ConcurrentHashMap<String, ConcurrentLinkedQueue<InFlightNotification>>()

    private val bluetoothStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BluetoothAdapter.ACTION_LOCAL_NAME_CHANGED) {
                val expectedName = pendingBluetoothName ?: return
                val currentName = intent.getStringExtra(BluetoothAdapter.EXTRA_LOCAL_NAME)
                if (currentName == expectedName) {
                    clearPendingBluetoothNameChange()
                    startAdvertising()
                }
                return
            }

            if (intent?.action != BluetoothAdapter.ACTION_STATE_CHANGED) return

            val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
            if (state != BluetoothAdapter.STATE_OFF && state != BluetoothAdapter.STATE_TURNING_OFF) {
                return
            }

            val hasActiveServer =
                startCallback != null || running || advertising || gattServer != null
            if (!hasActiveServer) return

            val reason = if (state == BluetoothAdapter.STATE_TURNING_OFF) {
                "Bluetooth is turning off"
            } else {
                "Bluetooth is not powered on"
            }
            emitError(reason)
            finishStart(false, reason)
            stop()
        }
    }

    private class NotificationOperation(
        targetDeviceIds: Collection<String>,
        private val callback: (Boolean, Array<String>, String) -> Unit
    ) {
        private val queuedDeviceIds = targetDeviceIds.toTypedArray()
        private val remainingDeviceIds = targetDeviceIds.toMutableSet()
        private var settled = false

        @Synchronized
        fun complete(deviceId: String, status: Int) {
            if (settled) return
            if (status != BluetoothGatt.GATT_SUCCESS) {
                settled = true
                callback(
                    false,
                    queuedDeviceIds,
                    "Notification failed for $deviceId: $status"
                )
                return
            }

            remainingDeviceIds.remove(deviceId)
            if (remainingDeviceIds.isEmpty()) {
                settled = true
                callback(true, queuedDeviceIds, "")
            }
        }

        @Synchronized
        fun fail(error: String) {
            if (settled) return
            settled = true
            callback(false, queuedDeviceIds, error)
        }
    }

    private data class InFlightNotification(
        val characteristicKey: String,
        val value: ByteArray,
        val operation: NotificationOperation
    )

    private enum class BluetoothNameResult {
        READY,
        PENDING,
        FAILED
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onServiceAdded(status: Int, service: BluetoothGattService) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError("Failed to add GATT service ${service.uuid}: $status")
                finishStart(false, "Failed to add GATT service ${service.uuid}: $status")
                stop()
                return
            }

            pendingServiceAdds -= 1
            if (pendingServiceAdds == 0) {
                startAdvertising()
            }
        }

        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    connectedDevices[device.address] = device
                    deviceMtus[device.address] = DEFAULT_ATT_MTU
                    subscribedCharacteristicKeysByDevice.getOrPut(device.address) {
                        ConcurrentHashMap.newKeySet()
                    }
                    emit(NativeGattServerEventType.DEVICECONNECTED, deviceId = device.address)
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    val mtu = currentMtu(device.address)
                    connectedDevices.remove(device.address)
                    deviceMtus.remove(device.address)
                    subscribedCharacteristicKeysByDevice.remove(device.address)
                    failNotifications(
                        device.address,
                        "Device ${device.address} disconnected before notification completed"
                    )
                    emit(
                        NativeGattServerEventType.DEVICEDISCONNECTED,
                        deviceId = device.address,
                        mtu = mtu
                    )
                }
            }
        }

        override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
            connectedDevices[device.address] = device
            deviceMtus[device.address] = mtu
            emit(
                NativeGattServerEventType.MTUCHANGED,
                deviceId = device.address,
                mtu = mtu
            )
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            val serviceId = characteristic.service?.uuid?.toString().orEmpty()
            val characteristicId = characteristic.uuid.toString()
            val key = characteristicKey(serviceId, characteristicId)
            val fullValue = characteristicValues[key] ?: byteArrayOf()
            val safeOffset = offset.coerceAtLeast(0)

            if (safeOffset > fullValue.size) {
                gattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_INVALID_OFFSET,
                    offset,
                    null
                )
                return
            }

            val response = fullValue.copyOfRange(safeOffset, fullValue.size)
            gattServer?.sendResponse(
                device,
                requestId,
                BluetoothGatt.GATT_SUCCESS,
                safeOffset,
                response
            )
            connectedDevices[device.address] = device
            emit(
                NativeGattServerEventType.CHARACTERISTICREAD,
                deviceId = device.address,
                serviceId = serviceId,
                characteristicId = characteristicId,
                data = fullValue
            )
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            val serviceId = characteristic.service?.uuid?.toString().orEmpty()
            val characteristicId = characteristic.uuid.toString()
            val key = characteristicKey(serviceId, characteristicId)

            if (preparedWrite) {
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED,
                        offset,
                        null
                    )
                }
                return
            }

            if (value == null) {
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_INVALID_ATTRIBUTE_LENGTH,
                        offset,
                        null
                    )
                }
                return
            }

            if (offset < 0) {
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_INVALID_OFFSET,
                        offset,
                        null
                    )
                }
                return
            }

            val current = characteristicValues[key] ?: byteArrayOf()
            val next = if (offset == 0) {
                value.copyOf()
            } else {
                if (offset > current.size) {
                    if (responseNeeded) {
                        gattServer?.sendResponse(
                            device,
                            requestId,
                            BluetoothGatt.GATT_INVALID_OFFSET,
                            offset,
                            null
                        )
                    }
                    return
                }
                val combined = ByteArray(offset + value.size)
                System.arraycopy(current, 0, combined, 0, offset)
                System.arraycopy(value, 0, combined, offset, value.size)
                combined
            }

            characteristicValues[key] = next
            characteristic.value = next
            connectedDevices[device.address] = device

            if (responseNeeded) {
                gattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_SUCCESS,
                    offset,
                    value
                )
            }

            emit(
                NativeGattServerEventType.CHARACTERISTICWRITE,
                deviceId = device.address,
                serviceId = serviceId,
                characteristicId = characteristicId,
                data = next
            )
        }

        override fun onDescriptorReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            descriptor: BluetoothGattDescriptor
        ) {
            val characteristic = descriptor.characteristic
            if (descriptor.uuid != CLIENT_CONFIG_DESCRIPTOR || characteristic == null) {
                gattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_READ_NOT_PERMITTED,
                    offset,
                    null
                )
                return
            }

            val serviceId = characteristic.service?.uuid?.toString().orEmpty()
            val characteristicId = characteristic.uuid.toString()
            val key = characteristicKey(serviceId, characteristicId)
            val isSubscribed =
                subscribedCharacteristicKeysByDevice[device.address]?.contains(key) == true
            val value = when {
                !isSubscribed -> BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0 ->
                    BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                else -> BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
            }

            if (offset < 0 || offset > value.size) {
                gattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_INVALID_OFFSET,
                    offset,
                    null
                )
                return
            }

            gattServer?.sendResponse(
                device,
                requestId,
                BluetoothGatt.GATT_SUCCESS,
                offset,
                value.copyOfRange(offset, value.size)
            )
        }

        override fun onDescriptorWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            descriptor: BluetoothGattDescriptor,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            val characteristic = descriptor.characteristic
            val serviceId = characteristic?.service?.uuid?.toString().orEmpty()
            val characteristicId = characteristic?.uuid?.toString().orEmpty()
            val key = characteristicKey(serviceId, characteristicId)

            if (descriptor.uuid != CLIENT_CONFIG_DESCRIPTOR || characteristic == null) {
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_WRITE_NOT_PERMITTED,
                        offset,
                        null
                    )
                }
                return
            }

            val enableNotify = value != null &&
                Arrays.equals(value, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
            val enableIndicate = value != null &&
                Arrays.equals(value, BluetoothGattDescriptor.ENABLE_INDICATION_VALUE)
            val disable = value != null &&
                Arrays.equals(value, BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE)
            val supportsNotify =
                characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0
            val supportsIndicate =
                characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0

            val status = when {
                preparedWrite -> BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED
                offset != 0 -> BluetoothGatt.GATT_INVALID_OFFSET
                enableNotify && supportsNotify -> BluetoothGatt.GATT_SUCCESS
                enableIndicate && supportsIndicate -> BluetoothGatt.GATT_SUCCESS
                disable -> BluetoothGatt.GATT_SUCCESS
                else -> BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED
            }

            if (status == BluetoothGatt.GATT_SUCCESS) {
                val subscriptions = subscribedCharacteristicKeysByDevice.getOrPut(device.address) {
                    ConcurrentHashMap.newKeySet()
                }
                if (disable) {
                    subscriptions.remove(key)
                    emit(
                        NativeGattServerEventType.NOTIFICATIONUNSUBSCRIBED,
                        deviceId = device.address,
                        serviceId = serviceId,
                        characteristicId = characteristicId,
                        descriptorId = descriptor.uuid.toString(),
                        isSubscribed = false
                    )
                } else {
                    subscriptions.add(key)
                    emit(
                        NativeGattServerEventType.NOTIFICATIONSUBSCRIBED,
                        deviceId = device.address,
                        serviceId = serviceId,
                        characteristicId = characteristicId,
                        descriptorId = descriptor.uuid.toString(),
                        isSubscribed = true
                    )
                }
            }

            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, status, offset, value)
            }
        }

        override fun onNotificationSent(device: BluetoothDevice, status: Int) {
            val notificationQueue = inFlightNotificationsByDevice[device.address]
            val notification = if (notificationQueue == null) null else synchronized(notificationQueue) {
                notificationQueue.poll()
            }
            val (serviceId, characteristicId) = splitCharacteristicKey(
                notification?.characteristicKey.orEmpty()
            )
            notification?.operation?.complete(device.address, status)
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError(
                    "Notification failed for ${device.address}: $status",
                    deviceId = device.address,
                    serviceId = serviceId,
                    characteristicId = characteristicId
                )
            }
            sendNextNotification(device.address)
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            advertising = true
            running = true
            emit(NativeGattServerEventType.ADVERTISINGSTARTED)
            finishStart(true, "")
        }

        override fun onStartFailure(errorCode: Int) {
            advertising = false
            val reason = advertiseErrorCodeToString(errorCode)
            emitError(reason)
            finishStart(false, reason)
            stop()
        }
    }

    fun start(options: GattServerOptions, callback: (Boolean, String) -> Unit) {
        if (!hasRequiredPermissions(options.advertising.enabled)) {
            callback(false, "Missing Bluetooth permissions")
            return
        }

        val adapter = bluetoothAdapter
        if (adapter == null) {
            callback(false, "Bluetooth adapter not available")
            return
        }

        if (!adapter.isEnabled) {
            callback(false, "Bluetooth is not powered on")
            return
        }

        if (options.advertising.enabled && !adapter.isMultipleAdvertisementSupported) {
            callback(false, "BLE advertising is not supported on this device")
            return
        }

        stop()
        this.options = options
        startCallback = callback
        registerBluetoothStateReceiver()
        characteristicsByKey.clear()
        characteristicValues.clear()

        gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
        if (gattServer == null) {
            finishStart(false, "Failed to open GATT server")
            stop()
            return
        }

        pendingServiceAdds = options.services.size
        if (pendingServiceAdds == 0) {
            finishStart(false, "At least one GATT service is required")
            stop()
            return
        }

        for (serviceConfig in options.services) {
            val service = createService(serviceConfig)
            if (gattServer?.addService(service) != true) {
                finishStart(false, "Failed to add GATT service ${service.uuid}")
                stop()
                return
            }
        }
    }

    fun stop() {
        val shouldEmit = advertising
        runCatching { bluetoothAdapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback) }
        clearPendingBluetoothNameChange()
        restoreBluetoothName()
        gattServer?.close()
        gattServer = null
        unregisterBluetoothStateReceiver()
        startCallback = null
        pendingServiceAdds = 0
        advertising = false
        running = false
        options = null
        characteristicsByKey.clear()
        characteristicValues.clear()
        connectedDevices.clear()
        deviceMtus.clear()
        subscribedCharacteristicKeysByDevice.clear()
        for (deviceId in inFlightNotificationsByDevice.keys.toList()) {
            failNotifications(
                deviceId,
                "GATT server stopped before notification completed"
            )
        }
        if (shouldEmit) {
            emit(NativeGattServerEventType.ADVERTISINGSTOPPED)
        }
    }

    fun isRunning(): Boolean = running && isBluetoothEnabled() && gattServer != null

    fun isAdvertising(): Boolean = advertising && isBluetoothEnabled()

    fun getConnectedDevices(): Array<String> = connectedDevices.keys().toList().toTypedArray()

    fun getDeviceMtu(deviceId: String): Double {
        return if (connectedDevices.containsKey(deviceId)) {
            currentMtu(deviceId).toDouble()
        } else {
            0.0
        }
    }

    fun setCharacteristicValue(
        serviceId: String,
        characteristicId: String,
        value: ByteArray
    ): Boolean {
        val key = characteristicKey(serviceId, characteristicId)
        val characteristic = characteristicsByKey[key] ?: return false
        val copy = value.copyOf()
        characteristicValues[key] = copy
        characteristic.value = copy
        return true
    }

    fun notifyCharacteristicChanged(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        value: ByteArray,
        callback: (Boolean, Array<String>, String) -> Unit
    ) {
        val key = characteristicKey(serviceId, characteristicId)
        val characteristic = characteristicsByKey[key]
        if (characteristic == null) {
            callback(false, emptyArray(), "Characteristic not found")
            return
        }
        if (gattServer == null) {
            callback(false, emptyArray(), "GATT server is not running")
            return
        }

        setCharacteristicValue(serviceId, characteristicId, value)

        val targets = if (deviceId.isBlank()) {
            connectedDevices.values.toList()
        } else {
            listOfNotNull(connectedDevices[deviceId])
        }

        if (deviceId.isNotBlank() && targets.isEmpty()) {
            callback(false, emptyArray(), "Device $deviceId is not connected")
            return
        }

        val subscribedTargets = targets.filter { device ->
            subscribedCharacteristicKeysByDevice[device.address]?.contains(key) == true
        }
        if (subscribedTargets.isEmpty()) {
            callback(true, emptyArray(), "")
            return
        }

        val operation = NotificationOperation(
            subscribedTargets.map { it.address },
            callback
        )
        val valueCopy = value.copyOf()
        for (device in subscribedTargets) {
            val notification = InFlightNotification(key, valueCopy, operation)
            val notificationQueue = inFlightNotificationsByDevice.getOrPut(device.address) {
                ConcurrentLinkedQueue()
            }
            val shouldSend = synchronized(notificationQueue) {
                val wasEmpty = notificationQueue.isEmpty()
                notificationQueue.add(notification)
                wasEmpty
            }
            if (shouldSend) {
                sendNextNotification(device.address)
            }
        }
    }

    private fun sendNextNotification(deviceId: String) {
        val notificationQueue = inFlightNotificationsByDevice[deviceId] ?: return
        val notification = synchronized(notificationQueue) { notificationQueue.peek() }
            ?: run {
                inFlightNotificationsByDevice.remove(deviceId, notificationQueue)
                return
            }
        val device = connectedDevices[deviceId]
        val server = gattServer
        val characteristic = characteristicsByKey[notification.characteristicKey]
        if (device == null || server == null || characteristic == null) {
            synchronized(notificationQueue) { notificationQueue.poll() }
            notification.operation.fail("Unable to send notification to $deviceId")
            sendNextNotification(deviceId)
            return
        }

        val confirm =
            characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0
        characteristic.value = notification.value
        if (!server.notifyCharacteristicChanged(device, characteristic, confirm)) {
            synchronized(notificationQueue) { notificationQueue.poll() }
            notification.operation.fail("Failed to notify $deviceId")
            sendNextNotification(deviceId)
        }
    }

    private fun failNotifications(deviceId: String, error: String) {
        val notificationQueue = inFlightNotificationsByDevice.remove(deviceId) ?: return
        while (true) {
            val notification = synchronized(notificationQueue) { notificationQueue.poll() } ?: break
            notification.operation.fail(error)
        }
    }

    fun disconnectDevice(deviceId: String): Boolean {
        val device = connectedDevices[deviceId] ?: return false
        gattServer?.cancelConnection(device)
        return true
    }

    private fun currentMtu(deviceId: String): Int {
        return deviceMtus[deviceId] ?: DEFAULT_ATT_MTU
    }

    private fun createService(config: GattServerService): BluetoothGattService {
        val type = if (config.primary) {
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        } else {
            BluetoothGattService.SERVICE_TYPE_SECONDARY
        }
        val service = BluetoothGattService(UUID.fromString(config.uuid), type)

        for (characteristicConfig in config.characteristics) {
            val characteristic = BluetoothGattCharacteristic(
                UUID.fromString(characteristicConfig.uuid),
                characteristicConfig.properties.toInt(),
                androidPermissions(characteristicConfig.permissions.toInt())
            )
            val value = characteristicConfig.value.toByteArray()
            characteristic.value = value

            val key = characteristicKey(config.uuid, characteristicConfig.uuid)
            characteristicsByKey[key] = characteristic
            characteristicValues[key] = value

            if (
                characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0 ||
                characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0
            ) {
                characteristic.addDescriptor(
                    BluetoothGattDescriptor(
                        CLIENT_CONFIG_DESCRIPTOR,
                        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
                    )
                )
            }

            service.addCharacteristic(characteristic)
        }

        return service
    }

    private fun androidPermissions(flags: Int): Int {
        var permissions = 0
        if (flags and PERMISSION_READ_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_READ
        }
        if (flags and PERMISSION_WRITE_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_WRITE
        }
        if (flags and PERMISSION_READ_ENCRYPTED_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED
        }
        if (flags and PERMISSION_READ_ENCRYPTED_MITM_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED_MITM
        }
        if (flags and PERMISSION_WRITE_ENCRYPTED_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED
        }
        if (flags and PERMISSION_WRITE_ENCRYPTED_MITM_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED_MITM
        }
        if (flags and PERMISSION_WRITE_SIGNED_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED
        }
        if (flags and PERMISSION_WRITE_SIGNED_MITM_FLAG != 0) {
            permissions = permissions or BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED_MITM
        }
        return permissions
    }

    private fun startAdvertising() {
        val adapter = bluetoothAdapter
        val advertiser = adapter?.bluetoothLeAdvertiser
        val currentOptions = options
        val advertisingOptions = currentOptions?.advertising

        if (advertisingOptions?.enabled == false) {
            running = true
            finishStart(true, "")
            return
        }

        if (adapter == null || advertiser == null || currentOptions == null || advertisingOptions == null) {
            finishStart(false, "BLE advertiser is not available")
            stop()
            return
        }

        when (applyBluetoothName(adapter, advertisingOptions)) {
            BluetoothNameResult.PENDING -> return
            BluetoothNameResult.FAILED -> {
                finishStart(false, "Failed to set Bluetooth device name")
                stop()
                return
            }
            BluetoothNameResult.READY -> Unit
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(androidAdvertiseMode(advertisingOptions.androidAdvertiseMode))
            .setTxPowerLevel(androidTxPowerLevel(advertisingOptions.androidTxPowerLevel))
            .setConnectable(advertisingOptions.androidConnectable)
            .build()

        val dataBuilder = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(advertisingOptions.includeTxPowerLevel)
        for (uuid in advertisingOptions.serviceUUIDs) {
            dataBuilder.addServiceUuid(ParcelUuid(UUID.fromString(uuid)))
        }

        val scanResponseBuilder = AdvertiseData.Builder()
            .setIncludeTxPowerLevel(false)
        if (advertisingOptions.includeDeviceName) {
            scanResponseBuilder.setIncludeDeviceName(true)
        }

        advertiser.startAdvertising(
            settings,
            dataBuilder.build(),
            scanResponseBuilder.build(),
            advertiseCallback
        )
    }

    private fun applyBluetoothName(
        adapter: BluetoothAdapter,
        advertisingOptions: GattServerAdvertisingOptions
    ): BluetoothNameResult {
        val localName = advertisingOptions.localName
        if (!advertisingOptions.includeDeviceName || localName.isBlank()) {
            return BluetoothNameResult.READY
        }

        val currentName = runCatching { adapter.name }.getOrNull()
            ?: return BluetoothNameResult.FAILED
        if (currentName == localName) return BluetoothNameResult.READY

        originalBluetoothName = currentName
        pendingBluetoothName = localName
        val wasSet = runCatching { adapter.setName(localName) }.getOrDefault(false)
        if (!wasSet) {
            clearPendingBluetoothNameChange()
            originalBluetoothName = null
            return BluetoothNameResult.FAILED
        }

        if (pendingBluetoothName != null) {
            mainHandler.postDelayed(bluetoothNameChangeTimeout, BLUETOOTH_NAME_TIMEOUT_MS)
        }
        return BluetoothNameResult.PENDING
    }

    private fun clearPendingBluetoothNameChange() {
        pendingBluetoothName = null
        mainHandler.removeCallbacks(bluetoothNameChangeTimeout)
    }

    private fun restoreBluetoothName() {
        val originalName = originalBluetoothName
        originalBluetoothName = null
        if (originalName == null) return

        runCatching { bluetoothAdapter?.setName(originalName) }
    }

    private fun finishStart(success: Boolean, error: String) {
        val callback = startCallback
        startCallback = null
        callback?.invoke(success, error)
    }

    private fun emit(
        type: NativeGattServerEventType,
        deviceId: String = "",
        serviceId: String = "",
        characteristicId: String = "",
        descriptorId: String = "",
        data: ByteArray = byteArrayOf(),
        isSubscribed: Boolean = false,
        mtu: Int = 0,
        error: String = ""
    ) {
        val resolvedMtu = when {
            mtu > 0 -> mtu
            deviceId.isNotBlank() -> currentMtu(deviceId)
            else -> 0
        }
        eventCallback(
            GattServerEvent(
                type = type,
                deviceId = deviceId,
                serviceId = serviceId,
                characteristicId = characteristicId,
                descriptorId = descriptorId,
                data = ArrayBuffer.copy(data),
                isSubscribed = isSubscribed,
                mtu = resolvedMtu.toDouble(),
                error = error
            )
        )
    }

    private fun emitError(
        error: String,
        deviceId: String = "",
        serviceId: String = "",
        characteristicId: String = ""
    ) {
        emit(
            NativeGattServerEventType.ERROR,
            deviceId = deviceId,
            serviceId = serviceId,
            characteristicId = characteristicId,
            error = error
        )
    }

    private fun androidAdvertiseMode(mode: AndroidGattServerAdvertiseMode): Int {
        return when (mode) {
            AndroidGattServerAdvertiseMode.LOWPOWER -> AdvertiseSettings.ADVERTISE_MODE_LOW_POWER
            AndroidGattServerAdvertiseMode.LOWLATENCY -> AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY
            AndroidGattServerAdvertiseMode.BALANCED -> AdvertiseSettings.ADVERTISE_MODE_BALANCED
        }
    }

    private fun androidTxPowerLevel(txPowerLevel: AndroidGattServerAdvertiseTxPowerLevel): Int {
        return when (txPowerLevel) {
            AndroidGattServerAdvertiseTxPowerLevel.ULTRALOW -> AdvertiseSettings.ADVERTISE_TX_POWER_ULTRA_LOW
            AndroidGattServerAdvertiseTxPowerLevel.LOW -> AdvertiseSettings.ADVERTISE_TX_POWER_LOW
            AndroidGattServerAdvertiseTxPowerLevel.MEDIUM -> AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM
            AndroidGattServerAdvertiseTxPowerLevel.HIGH -> AdvertiseSettings.ADVERTISE_TX_POWER_HIGH
        }
    }

    private fun hasRequiredPermissions(advertisingEnabled: Boolean): Boolean {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (advertisingEnabled) {
                arrayOf(
                    Manifest.permission.BLUETOOTH_ADVERTISE,
                    Manifest.permission.BLUETOOTH_CONNECT
                )
            } else {
                arrayOf(Manifest.permission.BLUETOOTH_CONNECT)
            }
        } else {
            if (advertisingEnabled) {
                arrayOf(
                    Manifest.permission.BLUETOOTH,
                    Manifest.permission.BLUETOOTH_ADMIN
                )
            } else {
                arrayOf(Manifest.permission.BLUETOOTH)
            }
        }

        return permissions.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun registerBluetoothStateReceiver() {
        if (bluetoothStateReceiverRegistered) return

        val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED).apply {
            addAction(BluetoothAdapter.ACTION_LOCAL_NAME_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(
                bluetoothStateReceiver,
                filter,
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            @Suppress("DEPRECATION")
            context.registerReceiver(bluetoothStateReceiver, filter)
        }
        bluetoothStateReceiverRegistered = true
    }

    private fun unregisterBluetoothStateReceiver() {
        if (!bluetoothStateReceiverRegistered) return

        runCatching { context.unregisterReceiver(bluetoothStateReceiver) }
        bluetoothStateReceiverRegistered = false
    }

    private fun isBluetoothEnabled(): Boolean =
        runCatching { bluetoothAdapter?.isEnabled == true }.getOrDefault(false)

    private fun advertiseErrorCodeToString(errorCode: Int): String {
        return when (errorCode) {
            AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertisement data is too large"
            AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers are active"
            AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "Advertising is already started"
            AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal advertising error"
            AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "BLE advertising is not supported"
            else -> "Advertising failed with error code $errorCode"
        }
    }

    private fun characteristicKey(serviceId: String, characteristicId: String): String =
        "${serviceId.lowercase()}:${characteristicId.lowercase()}"

    private fun splitCharacteristicKey(key: String): Pair<String, String> {
        val separator = key.indexOf(':')
        if (separator < 0) return "" to ""
        return key.substring(0, separator) to key.substring(separator + 1)
    }

    private companion object {
        const val DEFAULT_ATT_MTU = 23
        const val BLUETOOTH_NAME_TIMEOUT_MS = 2_000L
        val CLIENT_CONFIG_DESCRIPTOR: UUID =
            UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        const val PERMISSION_READ_FLAG = 1
        const val PERMISSION_WRITE_FLAG = 2
        const val PERMISSION_READ_ENCRYPTED_FLAG = 4
        const val PERMISSION_READ_ENCRYPTED_MITM_FLAG = 8
        const val PERMISSION_WRITE_ENCRYPTED_FLAG = 16
        const val PERMISSION_WRITE_ENCRYPTED_MITM_FLAG = 32
        const val PERMISSION_WRITE_SIGNED_FLAG = 64
        const val PERMISSION_WRITE_SIGNED_MITM_FLAG = 128
    }
}
