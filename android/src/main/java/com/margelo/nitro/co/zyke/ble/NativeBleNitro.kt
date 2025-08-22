package com.margelo.nitro.co.zyke.ble

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.margelo.nitro.core.Promise
import java.util.*
import java.util.concurrent.ConcurrentHashMap

class NativeBleNitro(private val context: Context) : HybridNativeBleNitroSpec() {
    
    companion object {
        private const val TAG = "NativeBleNitro"
        
        // BLE State mapping
        private fun bluetoothStateToBlEState(state: Int): BLEState {
            return when (state) {
                BluetoothAdapter.STATE_OFF -> BLEState.POWEREDOFF
                BluetoothAdapter.STATE_ON -> BLEState.POWEREDON
                BluetoothAdapter.STATE_TURNING_OFF, BluetoothAdapter.STATE_TURNING_ON -> BLEState.RESETTING
                else -> BLEState.UNKNOWN
            }
        }
        
        // UUID conversion helpers
        private fun uuidToString(uuid: UUID): String = uuid.toString().lowercase()
        
        private fun stringToUuid(uuidString: String): UUID {
            return try {
                UUID.fromString(uuidString)
            } catch (e: Exception) {
                // Handle short UUIDs by expanding them to full 128-bit format
                if (uuidString.length <= 8) {
                    val padded = uuidString.padStart(8, '0')
                    UUID.fromString("$padded-0000-1000-8000-00805f9b34fb")
                } else {
                    throw e
                }
            }
        }
        
        // Convert byte array to double array (for JS compatibility)
        private fun byteArrayToDoubleArray(bytes: ByteArray): DoubleArray {
            return bytes.map { it.toUByte().toDouble() }.toDoubleArray()
        }
        
        // Convert double array to byte array
        private fun doubleArrayToByteArray(doubles: DoubleArray): ByteArray {
            return doubles.map { it.toInt().toByte() }.toByteArray()
        }
    }
    
    private val bluetoothManager: BluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private val bluetoothLeScanner: BluetoothLeScanner? = bluetoothAdapter?.bluetoothLeScanner
    
    // State management
    private var isScanning = false
    private var scanCallback: ((device: BLEDevice) -> Unit)? = null
    private var stateChangeCallback: ((state: BLEState) -> Unit)? = null
    
    // Connection management
    private val connectedDevices = ConcurrentHashMap<String, BluetoothGatt>()
    private val connectionCallbacks = ConcurrentHashMap<String, (success: Boolean, deviceId: String, error: String) -> Unit>()
    private val disconnectCallbacks = ConcurrentHashMap<String, (deviceId: String, interrupted: Boolean, error: String) -> Unit>()
    
    // Service discovery and operations
    private val discoveryCallbacks = ConcurrentHashMap<String, (success: Boolean, error: String) -> Unit>()
    private val operationCallbacks = ConcurrentHashMap<String, (success: Boolean, error: String) -> Unit>()
    private val characteristicCallbacks = ConcurrentHashMap<String, (success: Boolean, data: DoubleArray, error: String) -> Unit>()
    private val notificationCallbacks = ConcurrentHashMap<String, (characteristicId: String, data: DoubleArray) -> Unit>()
    
    override fun startScan(filter: ScanFilter, callback: (device: BLEDevice) -> Unit) {
        if (!hasBluetoothPermissions()) {
            return
        }
        
        if (isScanning) {
            return
        }
        
        val scanner = bluetoothLeScanner ?: return
        this.scanCallback = callback
        
        // Map AndroidScanMode to Android ScanSettings scan mode
        val androidScanMode = when (filter.androidScanMode) {
            AndroidScanMode.LOWPOWER -> ScanSettings.SCAN_MODE_LOW_POWER
            AndroidScanMode.BALANCED -> ScanSettings.SCAN_MODE_BALANCED
            AndroidScanMode.LOWLATENCY -> ScanSettings.SCAN_MODE_LOW_LATENCY
            AndroidScanMode.OPPORTUNISTIC -> ScanSettings.SCAN_MODE_OPPORTUNISTIC
            else -> ScanSettings.SCAN_MODE_LOW_LATENCY // Default fallback
        }
        
        val scanSettings = ScanSettings.Builder()
            .setScanMode(androidScanMode)
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            .build()
        
        val bleScanFilters = mutableListOf<android.bluetooth.le.ScanFilter>()
        
        // Add service UUID filters if provided
        if (filter.serviceUUIDs.isNotEmpty()) {
            filter.serviceUUIDs.forEach { serviceUUID ->
                try {
                    val uuid = stringToUuid(serviceUUID)
                    val bleScanFilter = android.bluetooth.le.ScanFilter.Builder()
                        .setServiceUuid(ParcelUuid(uuid))
                        .build()
                    bleScanFilters.add(bleScanFilter)
                } catch (e: Exception) {
                    // Skip invalid UUIDs
                }
            }
        }
        
        scanner.startScan(bleScanFilters.ifEmpty { null }, scanSettings, leScanCallback)
        isScanning = true
    }
    
    private val leScanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val scanRecord = result.scanRecord
            
            val bleDevice = BLEDevice(
                id = device.address,
                name = device.name ?: "Unknown Device",
                rssi = result.rssi.toDouble(),
                manufacturerData = parseManufacturerData(scanRecord?.manufacturerSpecificData),
                serviceUUIDs = parseServiceUUIDs(scanRecord?.serviceUuids),
                isConnectable = result.isConnectable
            )
            
            scanCallback?.invoke(bleDevice)
        }
        
        override fun onScanFailed(errorCode: Int) {
            isScanning = false
        }
    }
    
    private fun parseManufacturerData(manufacturerData: android.util.SparseArray<ByteArray>?): ManufacturerData {
        val entries = mutableListOf<ManufacturerDataEntry>()
        
        manufacturerData?.let { data ->
            for (i in 0 until data.size()) {
                val key = data.keyAt(i)
                val value = data.valueAt(i)
                entries.add(ManufacturerDataEntry(
                    id = key.toString(),
                    data = byteArrayToDoubleArray(value)
                ))
            }
        }
        
        return ManufacturerData(entries.toTypedArray())
    }
    
    private fun parseServiceUUIDs(serviceUuids: List<ParcelUuid>?): Array<String> {
        return serviceUuids?.map { uuidToString(it.uuid) }?.toTypedArray() ?: emptyArray()
    }
    
    override fun stopScan(): Boolean {
        if (!isScanning) {
            return true
        }
        
        if (!hasBluetoothPermissions()) {
            return false
        }
        
        bluetoothLeScanner?.stopScan(leScanCallback)
        isScanning = false
        scanCallback = null
        return true
    }
    
    override fun isScanning(): Boolean {
        return isScanning
    }
    
    @SuppressLint("MissingPermission")
    override fun getConnectedDevices(services: Array<String>): Array<BLEDevice> {
        if (!hasBluetoothPermissions()) {
            return emptyArray()
        }
        
        val devices = mutableListOf<BLEDevice>()
        
        connectedDevices.values.forEach { gatt ->
            val device = gatt.device
            devices.add(BLEDevice(
                id = device.address,
                name = device.name ?: "Unknown Device",
                rssi = 0.0, // RSSI not available for connected devices
                manufacturerData = ManufacturerData(emptyArray()),
                serviceUUIDs = gatt.services?.map { uuidToString(it.uuid) }?.toTypedArray() ?: emptyArray(),
                isConnectable = true
            ))
        }
        
        return devices.toTypedArray()
    }
    
    @SuppressLint("MissingPermission")
    override fun connect(
        deviceId: String,
        callback: (success: Boolean, deviceId: String, error: String) -> Unit,
        disconnectCallback: ((deviceId: String, interrupted: Boolean, error: String) -> Unit)?
    ) {
        if (!hasBluetoothPermissions()) {
            callback(false, "", "Bluetooth permissions not granted")
            return
        }
        
        if (connectedDevices.containsKey(deviceId)) {
            callback(true, deviceId, "")
            return
        }
        
        val device = bluetoothAdapter?.getRemoteDevice(deviceId)
        if (device == null) {
            callback(false, "", "Device not found")
            return
        }
        
        connectionCallbacks[deviceId] = callback
        disconnectCallback?.let { disconnectCallbacks[deviceId] = it }
        
        device.connectGatt(context, false, gattCallback)
    }
    
    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            val deviceId = gatt.device.address
            
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    connectedDevices[deviceId] = gatt
                    connectionCallbacks.remove(deviceId)?.invoke(true, deviceId, "")
                    gatt.discoverServices()
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    connectedDevices.remove(deviceId)
                    val interrupted = status != BluetoothGatt.GATT_SUCCESS
                    disconnectCallbacks.remove(deviceId)?.invoke(deviceId, interrupted, if (interrupted) "Connection interrupted" else "")
                    connectionCallbacks.remove(deviceId)?.invoke(false, "", "Failed to connect")
                    gatt.close()
                }
            }
        }
        
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            val deviceId = gatt.device.address
            val callback = discoveryCallbacks.remove(deviceId)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                callback?.invoke(true, "")
            } else {
                callback?.invoke(false, "Service discovery failed")
            }
        }
        
        override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            val key = "${gatt.device.address}-${characteristic.uuid}"
            val callback = characteristicCallbacks.remove(key)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val data = byteArrayToDoubleArray(characteristic.value ?: byteArrayOf())
                callback?.invoke(true, data, "")
            } else {
                callback?.invoke(false, doubleArrayOf(), "Read failed")
            }
        }
        
        override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            val key = "${gatt.device.address}-${characteristic.uuid}"
            val callback = operationCallbacks.remove(key)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                callback?.invoke(true, "")
            } else {
                callback?.invoke(false, "Write failed")
            }
        }
        
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val characteristicId = uuidToString(characteristic.uuid)
            val key = "${gatt.device.address}-${characteristic.uuid}"
            val callback = notificationCallbacks[key]
            
            val data = byteArrayToDoubleArray(characteristic.value ?: byteArrayOf())
            callback?.invoke(characteristicId, data)
        }
        
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            val key = "${gatt.device.address}-${descriptor.characteristic.uuid}"
            val callback = operationCallbacks.remove(key)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                callback?.invoke(true, "")
            } else {
                callback?.invoke(false, "Descriptor write failed")
            }
        }
    }
    
    @SuppressLint("MissingPermission")
    override fun disconnect(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            callback(true, "") // Already disconnected
            return
        }
        
        if (!hasBluetoothPermissions()) {
            callback(false, "Bluetooth permissions not granted")
            return
        }
        
        gatt.disconnect()
        callback(true, "")
    }
    
    override fun isConnected(deviceId: String): Boolean {
        return connectedDevices.containsKey(deviceId)
    }
    
    override fun discoverServices(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            callback(false, "Device not connected")
            return
        }
        
        discoveryCallbacks[deviceId] = callback
        if (!gatt.discoverServices()) {
            discoveryCallbacks.remove(deviceId)
            callback(false, "Failed to start service discovery")
        }
    }
    
    override fun getServices(deviceId: String): Array<String> {
        val gatt = connectedDevices[deviceId] ?: return emptyArray()
        return gatt.services?.map { uuidToString(it.uuid) }?.toTypedArray() ?: emptyArray()
    }
    
    override fun getCharacteristics(deviceId: String, serviceId: String): Array<String> {
        val gatt = connectedDevices[deviceId] ?: return emptyArray()
        val serviceUuid = stringToUuid(serviceId)
        val service = gatt.getService(serviceUuid) ?: return emptyArray()
        return service.characteristics?.map { uuidToString(it.uuid) }?.toTypedArray() ?: emptyArray()
    }
    
    @SuppressLint("MissingPermission")
    override fun readCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, data: DoubleArray, error: String) -> Unit
    ) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            callback(false, doubleArrayOf(), "Device not connected")
            return
        }
        
        try {
            val serviceUuid = stringToUuid(serviceId)
            val characteristicUuid = stringToUuid(characteristicId)
            val service = gatt.getService(serviceUuid)
            val characteristic = service?.getCharacteristic(characteristicUuid)
            
            if (characteristic == null) {
                callback(false, doubleArrayOf(), "Characteristic not found")
                return
            }
            
            val key = "$deviceId-${characteristic.uuid}"
            characteristicCallbacks[key] = callback
            
            if (!gatt.readCharacteristic(characteristic)) {
                characteristicCallbacks.remove(key)
                callback(false, doubleArrayOf(), "Failed to read characteristic")
            }
        } catch (e: Exception) {
            callback(false, doubleArrayOf(), "Invalid UUID: ${e.message}")
        }
    }
    
    @SuppressLint("MissingPermission")
    override fun writeCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        data: DoubleArray,
        withResponse: Boolean,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            callback(false, "Device not connected")
            return
        }
        
        try {
            val serviceUuid = stringToUuid(serviceId)
            val characteristicUuid = stringToUuid(characteristicId)
            val service = gatt.getService(serviceUuid)
            val characteristic = service?.getCharacteristic(characteristicUuid)
            
            if (characteristic == null) {
                callback(false, "Characteristic not found")
                return
            }
            
            val bytes = doubleArrayToByteArray(data)
            characteristic.value = bytes
            characteristic.writeType = if (withResponse) 
                BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT 
            else 
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            
            if (withResponse) {
                val key = "$deviceId-${characteristic.uuid}"
                operationCallbacks[key] = callback
                
                if (!gatt.writeCharacteristic(characteristic)) {
                    operationCallbacks.remove(key)
                    callback(false, "Failed to write characteristic")
                }
            } else {
                if (gatt.writeCharacteristic(characteristic)) {
                    callback(true, "")
                } else {
                    callback(false, "Failed to write characteristic")
                }
            }
        } catch (e: Exception) {
            callback(false, "Invalid UUID: ${e.message}")
        }
    }
    
    @SuppressLint("MissingPermission")
    override fun subscribeToCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        updateCallback: (characteristicId: String, data: DoubleArray) -> Unit,
        resultCallback: (success: Boolean, error: String) -> Unit
    ) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            resultCallback(false, "Device not connected")
            return
        }
        
        try {
            val serviceUuid = stringToUuid(serviceId)
            val characteristicUuid = stringToUuid(characteristicId)
            val service = gatt.getService(serviceUuid)
            val characteristic = service?.getCharacteristic(characteristicUuid)
            
            if (characteristic == null) {
                resultCallback(false, "Characteristic not found")
                return
            }
            
            val key = "$deviceId-${characteristic.uuid}"
            notificationCallbacks[key] = updateCallback
            
            // Enable local notifications
            if (!gatt.setCharacteristicNotification(characteristic, true)) {
                notificationCallbacks.remove(key)
                resultCallback(false, "Failed to set notification")
                return
            }
            
            // Enable remote notifications by writing to descriptor
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                
                operationCallbacks[key] = resultCallback
                if (!gatt.writeDescriptor(descriptor)) {
                    operationCallbacks.remove(key)
                    notificationCallbacks.remove(key)
                    resultCallback(false, "Failed to write descriptor")
                }
            } else {
                resultCallback(true, "") // No descriptor needed
            }
        } catch (e: Exception) {
            resultCallback(false, "Invalid UUID: ${e.message}")
        }
    }
    
    @SuppressLint("MissingPermission")
    override fun unsubscribeFromCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        val gatt = connectedDevices[deviceId]
        if (gatt == null) {
            callback(false, "Device not connected")
            return
        }
        
        try {
            val serviceUuid = stringToUuid(serviceId)
            val characteristicUuid = stringToUuid(characteristicId)
            val service = gatt.getService(serviceUuid)
            val characteristic = service?.getCharacteristic(characteristicUuid)
            
            if (characteristic == null) {
                callback(false, "Characteristic not found")
                return
            }
            
            val key = "$deviceId-${characteristic.uuid}"
            notificationCallbacks.remove(key)
            
            // Disable local notifications
            if (!gatt.setCharacteristicNotification(characteristic, false)) {
                callback(false, "Failed to disable notification")
                return
            }
            
            // Disable remote notifications
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                
                operationCallbacks[key] = callback
                if (!gatt.writeDescriptor(descriptor)) {
                    operationCallbacks.remove(key)
                    callback(false, "Failed to write descriptor")
                }
            } else {
                callback(true, "") // No descriptor needed
            }
        } catch (e: Exception) {
            callback(false, "Invalid UUID: ${e.message}")
        }
    }
    
    override fun requestBluetoothEnable(callback: (success: Boolean, error: String) -> Unit) {
        if (bluetoothAdapter?.isEnabled == true) {
            callback(true, "")
            return
        }
        
        try {
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(enableBtIntent)
            callback(true, "")
        } catch (e: Exception) {
            callback(false, "Failed to request Bluetooth enable: ${e.message}")
        }
    }
    
    override fun state(): BLEState {
        val adapter = bluetoothAdapter ?: return BLEState.UNSUPPORTED
        return bluetoothStateToBlEState(adapter.state)
    }
    
    override fun subscribeToStateChange(stateCallback: (state: BLEState) -> Unit): OperationResult {
        this.stateChangeCallback = stateCallback
        // Note: In a real implementation, you'd register a BroadcastReceiver for BluetoothAdapter.ACTION_STATE_CHANGED
        return OperationResult(true, "")
    }
    
    override fun unsubscribeFromStateChange(): OperationResult {
        this.stateChangeCallback = null
        // Note: In a real implementation, you'd unregister the BroadcastReceiver
        return OperationResult(true, "")
    }
    
    override fun openSettings(): Promise<Unit> {
        return Promise.resolve {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
    
    private fun hasBluetoothPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }
    }
}