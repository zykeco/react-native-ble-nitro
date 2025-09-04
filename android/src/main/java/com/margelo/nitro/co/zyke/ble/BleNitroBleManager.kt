package com.margelo.nitro.co.zyke.ble

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.margelo.nitro.core.*
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Android implementation of the BLE Nitro Module
 * This class provides the actual BLE functionality for Android devices
 */
class BleNitroBleManager : HybridNativeBleNitroSpec() {
    
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var stateCallback: ((state: BLEState) -> Unit)? = null
    private var bluetoothStateReceiver: BroadcastReceiver? = null
    private var restoreStateCallback: ((devices: List<BLEDevice>) -> Unit)? = null
    
    // BLE Scanning
    private var bleScanner: BluetoothLeScanner? = null
    private var isCurrentlyScanning = false
    private var scanCallback: ScanCallback? = null
    private var deviceFoundCallback: ((device: BLEDevice?, error: String?) -> Unit)? = null
    private val discoveredDevicesInCurrentScan = mutableSetOf<String>()
    
    // Device connections
    private val connectedDevices = ConcurrentHashMap<String, BluetoothGatt>()
    private val deviceCallbacks = ConcurrentHashMap<String, DeviceCallbacks>()
    
    // Helper class to store device callbacks
    private data class DeviceCallbacks(
        var connectCallback: ((success: Boolean, deviceId: String, error: String) -> Unit)? = null,
        var disconnectCallback: ((deviceId: String, interrupted: Boolean, error: String) -> Unit)? = null,
        var serviceDiscoveryCallback: ((success: Boolean, error: String) -> Unit)? = null,
        var characteristicSubscriptions: MutableMap<String, (characteristicId: String, data: ArrayBuffer) -> Unit> = mutableMapOf()
    )
    
    init {
        // Try to get context from React Native application context
        tryToGetContextFromReactNative()
    }
    
    companion object {
        private var appContext: Context? = null
        
        fun setContext(context: Context) {
            appContext = context.applicationContext
        }
        
        fun getContext(): Context? = appContext
    }
    
    private fun tryToGetContextFromReactNative() {
        if (appContext == null) {
            try {
                // Try to get Application context using reflection
                val activityThread = Class.forName("android.app.ActivityThread")
                val currentApplicationMethod = activityThread.getMethod("currentApplication")
                val application = currentApplicationMethod.invoke(null) as? android.app.Application
                
                if (application != null) {
                    setContext(application)
                }
            } catch (e: Exception) {
                // Context will be set by package initialization if reflection fails
            }
        }
    }
    
    private fun initializeBluetoothIfNeeded() {
        if (bluetoothAdapter == null) {
            try {
                val context = appContext ?: return
                val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
                bluetoothAdapter = bluetoothManager?.adapter
            } catch (e: Exception) {
                // Handle initialization error silently
            }
        }
    }

    private fun hasBluetoothPermissions(): Boolean {
        val context = appContext ?: return false
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ (API 31+) - check new Bluetooth permissions
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            // Android < 12 - check legacy permissions
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun getMissingPermissions(): List<String> {
        val context = appContext ?: return emptyList()
        val missing = mutableListOf<String>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ permissions
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.BLUETOOTH_SCAN)
            }
        } else {
            // Legacy permissions
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.BLUETOOTH)
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.BLUETOOTH_ADMIN)
            }
        }
        
        // Location permissions for BLE scanning
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        
        return missing
    }
    
    private fun bluetoothStateToBlEState(bluetoothState: Int): BLEState {
        return when (bluetoothState) {
            BluetoothAdapter.STATE_OFF -> BLEState.POWEREDOFF
            BluetoothAdapter.STATE_ON -> BLEState.POWEREDON
            BluetoothAdapter.STATE_TURNING_ON -> BLEState.RESETTING
            BluetoothAdapter.STATE_TURNING_OFF -> BLEState.RESETTING
            else -> BLEState.UNKNOWN
        }
    }
    
    private fun createBluetoothStateReceiver(): BroadcastReceiver {
        return object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == BluetoothAdapter.ACTION_STATE_CHANGED) {
                    val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                    val bleState = bluetoothStateToBlEState(state)
                    stateCallback?.invoke(bleState)
                }
            }
        }
    }
    
    private fun createBLEDeviceFromScanResult(scanResult: ScanResult): BLEDevice {
        val device = scanResult.device
        val scanRecord = scanResult.scanRecord
        
        // Extract manufacturer data
        val manufacturerData = scanRecord?.manufacturerSpecificData?.let { sparseArray ->
            val entries = mutableListOf<ManufacturerDataEntry>()
            for (i in 0 until sparseArray.size()) {
                val key = sparseArray.keyAt(i)
                val value = sparseArray.get(key)
                
                // Create direct ByteBuffer as required by ArrayBuffer.wrap()
                val directBuffer = java.nio.ByteBuffer.allocateDirect(value.size)
                directBuffer.put(value)
                directBuffer.flip()
                
                entries.add(ManufacturerDataEntry(
                    id = key.toString(),
                    data = ArrayBuffer.wrap(directBuffer)
                ))
            }
            ManufacturerData(companyIdentifiers = entries.toTypedArray())
        } ?: ManufacturerData(companyIdentifiers = emptyArray())
        
        // Extract service UUIDs
        val serviceUUIDs = scanRecord?.serviceUuids?.map { it.toString() }?.toTypedArray() ?: emptyArray()
        
        return BLEDevice(
            id = device.address,
            name = device.name ?: "",
            rssi = scanResult.rssi.toDouble(),
            manufacturerData = manufacturerData,
            serviceUUIDs = serviceUUIDs,
            isConnectable = true // Assume scannable devices are connectable
        )
    }
    
    private fun createAndroidScanFilters(filter: com.margelo.nitro.co.zyke.ble.ScanFilter): List<android.bluetooth.le.ScanFilter> {
        val filters = mutableListOf<android.bluetooth.le.ScanFilter>()
        
        // Add service UUID filters
        filter.serviceUUIDs.forEach { serviceId ->
            try {
                val builder = android.bluetooth.le.ScanFilter.Builder()
                val uuid = UUID.fromString(serviceId)
                builder.setServiceUuid(ParcelUuid(uuid))
                filters.add(builder.build())
            } catch (e: Exception) {
                // Invalid UUID, skip
            }
        }
        
        // If no specific filters, add empty filter to scan all devices
        if (filters.isEmpty()) {
            val builder = android.bluetooth.le.ScanFilter.Builder()
            filters.add(builder.build())
        }
        
        return filters
    }
    
    private fun createGattCallback(deviceId: String): BluetoothGattCallback {
        return object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                val callbacks = deviceCallbacks[deviceId]
                
                when (newState) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        callbacks?.connectCallback?.invoke(true, deviceId, "")
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        // Clean up
                        connectedDevices.remove(deviceId)
                        val interrupted = status != BluetoothGatt.GATT_SUCCESS
                        callbacks?.disconnectCallback?.invoke(deviceId, interrupted, if (interrupted) "Connection lost" else "")
                        deviceCallbacks.remove(deviceId)
                        gatt.close()
                    }
                }
            }
            
            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                val callbacks = deviceCallbacks[deviceId]
                val serviceDiscoveryCallback = callbacks?.serviceDiscoveryCallback
                
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    serviceDiscoveryCallback?.invoke(true, "")
                } else {
                    serviceDiscoveryCallback?.invoke(false, "Service discovery failed with status: $status")
                }
                
                // Clear the service discovery callback as it's one-time use
                callbacks?.serviceDiscoveryCallback = null
            }
            
            override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                // Handle characteristic read result
                val data = if (status == BluetoothGatt.GATT_SUCCESS) {
                    val value = characteristic.value ?: byteArrayOf()
                    // Create direct ByteBuffer as required by ArrayBuffer.wrap()
                    val directBuffer = java.nio.ByteBuffer.allocateDirect(value.size)
                    directBuffer.put(value)
                    directBuffer.flip()
                    ArrayBuffer.wrap(directBuffer)
                } else {
                    ArrayBuffer.allocate(0)
                }
                // This will be handled by pending operations
            }
            
            override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                // Handle characteristic write result
                // This will be handled by pending operations
            }
            
            override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
                // Handle characteristic notifications
                val characteristicId = characteristic.uuid.toString()
                val value = characteristic.value ?: byteArrayOf()
                
                // Create direct ByteBuffer as required by ArrayBuffer.wrap()
                val directBuffer = java.nio.ByteBuffer.allocateDirect(value.size)
                directBuffer.put(value)
                directBuffer.flip()
                
                val data = ArrayBuffer.wrap(directBuffer)
                
                val callbacks = deviceCallbacks[deviceId]
                callbacks?.characteristicSubscriptions?.get(characteristicId)?.invoke(characteristicId, data)
            }
            
            override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
                // Handle descriptor write (for enabling/disabling notifications)
            }
        }
    }

    override fun setRestoreStateCallback(callback: (restoredPeripherals: Array<BLEDevice>) -> Unit) {
        restoreStateCallback = { devices -> callback(devices.toTypedArray()) }
        return
    }

    // Scanning operations
    override fun startScan(filter: com.margelo.nitro.co.zyke.ble.ScanFilter, callback: (device: BLEDevice?, error: String?) -> Unit) {
        try {
            initializeBluetoothIfNeeded()
            val adapter = bluetoothAdapter ?: return
            
            if (!adapter.isEnabled) {
                return
            }
            
            if (isCurrentlyScanning) {
                return
            }
            
            // Clear discovered devices for fresh scan session
            discoveredDevicesInCurrentScan.clear()
            
            // Initialize scanner
            bleScanner = adapter.bluetoothLeScanner ?: return
            deviceFoundCallback = callback
            
            // Create scan callback
            scanCallback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    val device = createBLEDeviceFromScanResult(result)
                    
                    // Apply RSSI threshold filtering
                    if (device.rssi < filter.rssiThreshold) {
                        return
                    }
                    
                    // Apply application-level duplicate filtering if needed
                    if (!filter.allowDuplicates) {
                        if (discoveredDevicesInCurrentScan.contains(device.id)) {
                            return // Skip duplicate
                        }
                        discoveredDevicesInCurrentScan.add(device.id)
                    }
                    
                    callback(device, null)
                }
                
                override fun onBatchScanResults(results: MutableList<ScanResult>) {
                    results.forEach { result ->
                        val device = createBLEDeviceFromScanResult(result)
                        
                        // Apply RSSI threshold filtering
                        if (device.rssi < filter.rssiThreshold) {
                            return@forEach
                        }
                        
                        // Apply application-level duplicate filtering if needed
                        if (!filter.allowDuplicates) {
                            if (discoveredDevicesInCurrentScan.contains(device.id)) {
                                return@forEach // Skip duplicate
                            }
                            discoveredDevicesInCurrentScan.add(device.id)
                        }
                        
                        callback(device, null)
                    }
                }
                
                override fun onScanFailed(errorCode: Int) {
                    val errorMessage = when (errorCode) {
                        ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
                        ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "App registration failed"
                        ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                        ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "Internal error"
                        ScanCallback.SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES -> "Out of hardware resources"
                        ScanCallback.SCAN_FAILED_SCANNING_TOO_FREQUENTLY -> "Scanning too frequently"
                        else -> "Scan failed with error code: $errorCode"
                    }
                    callback(null, errorMessage)
                    stopScan()
                }
            }
            
            // Create scan filters and settings
            val scanFilters = createAndroidScanFilters(filter)
            val scanMode = when (filter.androidScanMode) {
                AndroidScanMode.LOWLATENCY -> ScanSettings.SCAN_MODE_LOW_LATENCY
                AndroidScanMode.LOWPOWER -> ScanSettings.SCAN_MODE_LOW_POWER
                AndroidScanMode.BALANCED -> ScanSettings.SCAN_MODE_BALANCED
                AndroidScanMode.OPPORTUNISTIC -> ScanSettings.SCAN_MODE_OPPORTUNISTIC
            }
            
            val scanSettingsBuilder = ScanSettings.Builder()
                .setScanMode(scanMode)
                .setReportDelay(0) // Report each advertisement individually
            
            // Always use CALLBACK_TYPE_ALL_MATCHES for application-level duplicate filtering
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                scanSettingsBuilder.setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            }
            
            val scanSettings = scanSettingsBuilder.build()
            
            // Start scanning
            bleScanner?.startScan(scanFilters, scanSettings, scanCallback)
            isCurrentlyScanning = true
            
        } catch (e: SecurityException) {
            isCurrentlyScanning = false
        } catch (e: Exception) {
            isCurrentlyScanning = false
        }
    }

    override fun stopScan(): Boolean {
        return try {
            if (scanCallback != null && isCurrentlyScanning) {
                bleScanner?.stopScan(scanCallback)
            }
            isCurrentlyScanning = false
            scanCallback = null
            deviceFoundCallback = null
            bleScanner = null
            discoveredDevicesInCurrentScan.clear() // Clear discovered devices for next scan session
            true
        } catch (e: Exception) {
            isCurrentlyScanning = false
            scanCallback = null
            deviceFoundCallback = null
            bleScanner = null
            discoveredDevicesInCurrentScan.clear()
            false
        }
    }

    override fun isScanning(): Boolean {
        return isCurrentlyScanning
    }

    // Device discovery
    override fun getConnectedDevices(services: Array<String>): Array<BLEDevice> {
        return try {
            val bluetoothManager = appContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val connectedDevices = bluetoothManager?.getConnectedDevices(BluetoothProfile.GATT) ?: emptyList()
            
            connectedDevices.map { device ->
                BLEDevice(
                    id = device.address,
                    name = device.name ?: "",
                    rssi = 0.0, // RSSI not available for already connected devices
                    manufacturerData = ManufacturerData(companyIdentifiers = emptyArray()),
                    serviceUUIDs = emptyArray(), // Service UUIDs not available without service discovery
                    isConnectable = true
                )
            }.toTypedArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    // Connection management
    override fun connect(
        deviceId: String,
        callback: (success: Boolean, deviceId: String, error: String) -> Unit,
        disconnectCallback: ((deviceId: String, interrupted: Boolean, error: String) -> Unit)?
    ) {
        try {
            initializeBluetoothIfNeeded()
            val adapter = bluetoothAdapter
            if (adapter == null) {
                callback(false, deviceId, "Bluetooth not available")
                return
            }
            
            val device = adapter.getRemoteDevice(deviceId)
            if (device == null) {
                callback(false, deviceId, "Device not found")
                return
            }
            
            // Store callbacks for this device
            deviceCallbacks[deviceId] = DeviceCallbacks(
                connectCallback = callback,
                disconnectCallback = disconnectCallback
            )
            
            // Create GATT callback
            val gattCallback = createGattCallback(deviceId)
            
            // Connect to device
            val context = appContext
            if (context != null) {
                val gatt = device.connectGatt(context, false, gattCallback)
                connectedDevices[deviceId] = gatt
            } else {
                callback(false, deviceId, "Context not available")
            }
            
        } catch (e: SecurityException) {
            callback(false, deviceId, "Permission denied")
        } catch (e: Exception) {
            callback(false, deviceId, "Connection error: ${e.message}")
        }
    }

    override fun disconnect(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt != null) {
                gatt.disconnect()
                callback(true, "")
            } else {
                callback(false, "Device not connected")
            }
        } catch (e: Exception) {
            callback(false, "Disconnect error: ${e.message}")
        }
    }

    override fun isConnected(deviceId: String): Boolean {
        return connectedDevices.containsKey(deviceId)
    }

    override fun requestMTU(deviceId: String, mtu: Double): Double {
        return try {
            val gatt = connectedDevices[deviceId]
            if (gatt != null) {
                val success = gatt.requestMtu(mtu.toInt())
                if (success) mtu else 0.0
            } else {
                0.0
            }
        } catch (e: Exception) {
            0.0
        }
    }

    // Service discovery
    override fun discoverServices(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt != null) {
                val callbacks = deviceCallbacks[deviceId]
                if (callbacks != null) {
                    // Store the callback for when service discovery completes
                    callbacks.serviceDiscoveryCallback = callback
                    
                    // Start service discovery
                    val success = gatt.discoverServices()
                    if (!success) {
                        // Clear callback and report failure immediately
                        callbacks.serviceDiscoveryCallback = null
                        callback(false, "Failed to start service discovery")
                    }
                    // If success, the callback will be invoked in onServicesDiscovered
                } else {
                    callback(false, "Device callback not found")
                }
            } else {
                callback(false, "Device not connected")
            }
        } catch (e: Exception) {
            callback(false, "Service discovery error: ${e.message}")
        }
    }

    override fun getServices(deviceId: String): Array<String> {
        return try {
            val gatt = connectedDevices[deviceId]
            gatt?.services?.map { service ->
                service.uuid.toString()
            }?.toTypedArray() ?: emptyArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    override fun getCharacteristics(deviceId: String, serviceId: String): Array<String> {
        return try {
            val gatt = connectedDevices[deviceId]
            val service = gatt?.getService(UUID.fromString(serviceId))
            service?.characteristics?.map { characteristic ->
                characteristic.uuid.toString()
            }?.toTypedArray() ?: emptyArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    // Characteristic operations
    override fun readCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, data: ArrayBuffer, error: String) -> Unit
    ) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt == null) {
                callback(false, ArrayBuffer.allocate(0), "Device not connected")
                return
            }
            
            val service = gatt.getService(UUID.fromString(serviceId))
            if (service == null) {
                callback(false, ArrayBuffer.allocate(0), "Service not found")
                return
            }
            
            val characteristic = service.getCharacteristic(UUID.fromString(characteristicId))
            if (characteristic == null) {
                callback(false, ArrayBuffer.allocate(0), "Characteristic not found")
                return
            }
            
            val success = gatt.readCharacteristic(characteristic)
            if (!success) {
                callback(false, ArrayBuffer.allocate(0), "Failed to start read operation")
            }
            // The actual result will come in onCharacteristicRead callback
            // For now, we'll return the cached value
            val data = characteristic.value?.let { value ->
                // Create direct ByteBuffer as required by ArrayBuffer.wrap()
                val directBuffer = java.nio.ByteBuffer.allocateDirect(value.size)
                directBuffer.put(value)
                directBuffer.flip()
                ArrayBuffer.wrap(directBuffer)
            } ?: ArrayBuffer.allocate(0)
            callback(success, data, if (success) "" else "Read operation failed")
            
        } catch (e: Exception) {
            callback(false, ArrayBuffer.allocate(0), "Read error: ${e.message}")
        }
    }

    override fun writeCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        data: ArrayBuffer,
        withResponse: Boolean,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt == null) {
                callback(false, "Device not connected")
                return
            }
            
            val service = gatt.getService(UUID.fromString(serviceId))
            if (service == null) {
                callback(false, "Service not found")
                return
            }
            
            val characteristic = service.getCharacteristic(UUID.fromString(characteristicId))
            if (characteristic == null) {
                callback(false, "Characteristic not found")
                return
            }
            
            // Convert ArrayBuffer to byte array using proper Nitro API
            val byteBuffer = data.getBuffer(copyIfNeeded = true)
            val bytes = ByteArray(byteBuffer.remaining())
            byteBuffer.get(bytes)
            
            characteristic.value = bytes
            characteristic.writeType = if (withResponse) {
                BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
            } else {
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            }
            
            val success = gatt.writeCharacteristic(characteristic)
            callback(success, if (success) "" else "Write operation failed")
            
        } catch (e: Exception) {
            callback(false, "Write error: ${e.message}")
        }
    }

    override fun subscribeToCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        updateCallback: (characteristicId: String, data: ArrayBuffer) -> Unit,
        resultCallback: (success: Boolean, error: String) -> Unit
    ) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt == null) {
                resultCallback(false, "Device not connected")
                return
            }
            
            val service = gatt.getService(UUID.fromString(serviceId))
            if (service == null) {
                resultCallback(false, "Service not found")
                return
            }
            
            val characteristic = service.getCharacteristic(UUID.fromString(characteristicId))
            if (characteristic == null) {
                resultCallback(false, "Characteristic not found")
                return
            }
            
            // Enable notifications
            val success = gatt.setCharacteristicNotification(characteristic, true)
            if (!success) {
                resultCallback(false, "Failed to enable notifications")
                return
            }
            
            // Store the callback
            val callbacks = deviceCallbacks[deviceId]
            if (callbacks != null) {
                callbacks.characteristicSubscriptions[characteristicId] = updateCallback
            }
            
            // Write to the descriptor to enable notifications on the device
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                gatt.writeDescriptor(descriptor)
            }
            
            resultCallback(true, "")
            
        } catch (e: Exception) {
            resultCallback(false, "Subscription error: ${e.message}")
        }
    }

    override fun unsubscribeFromCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        try {
            val gatt = connectedDevices[deviceId]
            if (gatt == null) {
                callback(false, "Device not connected")
                return
            }
            
            val service = gatt.getService(UUID.fromString(serviceId))
            if (service == null) {
                callback(false, "Service not found")
                return
            }
            
            val characteristic = service.getCharacteristic(UUID.fromString(characteristicId))
            if (characteristic == null) {
                callback(false, "Characteristic not found")
                return
            }
            
            // Disable notifications
            val success = gatt.setCharacteristicNotification(characteristic, false)
            if (!success) {
                callback(false, "Failed to disable notifications")
                return
            }
            
            // Remove the callback
            val callbacks = deviceCallbacks[deviceId]
            callbacks?.characteristicSubscriptions?.remove(characteristicId)
            
            // Write to the descriptor to disable notifications on the device
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                gatt.writeDescriptor(descriptor)
            }
            
            callback(true, "")
            
        } catch (e: Exception) {
            callback(false, "Unsubscription error: ${e.message}")
        }
    }

    // Bluetooth state management
    override fun requestBluetoothEnable(callback: (success: Boolean, error: String) -> Unit) {
        try {
            initializeBluetoothIfNeeded()
            val adapter = bluetoothAdapter
            if (adapter == null) {
                callback(false, "Bluetooth not supported on this device")
                return
            }
            
            if (adapter.isEnabled) {
                callback(true, "")
                return
            }
            
            // Request user to enable Bluetooth
            try {
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                appContext?.let { ctx ->
                    enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    ctx.startActivity(enableBtIntent)
                    callback(true, "Bluetooth enable request sent")
                } ?: callback(false, "Context not available")
            } catch (securityException: SecurityException) {
                callback(false, "Permission denied: Cannot request Bluetooth enable. Please check app permissions.")
            }
            
        } catch (e: Exception) {
            callback(false, "Error requesting Bluetooth enable: ${e.message}")
        }
    }

    override fun state(): BLEState {
        // Check permissions first
        if (!hasBluetoothPermissions()) {
            return BLEState.UNAUTHORIZED
        }
        
        initializeBluetoothIfNeeded()
        val adapter = bluetoothAdapter ?: return BLEState.UNSUPPORTED
        
        return try {
            bluetoothStateToBlEState(adapter.state)
        } catch (securityException: SecurityException) {
            BLEState.UNAUTHORIZED
        }
    }

    override fun subscribeToStateChange(stateCallback: (state: BLEState) -> Unit): OperationResult {
        try {
            val context = appContext ?: return OperationResult(success = false, error = "Context not available")
            
            // Unsubscribe from any existing subscription
            unsubscribeFromStateChange()
            
            // Store the callback
            this.stateCallback = stateCallback
            
            // Create and register broadcast receiver
            bluetoothStateReceiver = createBluetoothStateReceiver()
            val intentFilter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(bluetoothStateReceiver, intentFilter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(bluetoothStateReceiver, intentFilter)
            }
            
            return OperationResult(success = true, error = null)
        } catch (e: Exception) {
            return OperationResult(success = false, error = "Error subscribing to state changes: ${e.message}")
        }
    }

    override fun unsubscribeFromStateChange(): OperationResult {
        try {
            // Clear the callback
            this.stateCallback = null
            
            // Unregister broadcast receiver if it exists
            bluetoothStateReceiver?.let { receiver ->
                val context = appContext
                if (context != null) {
                    try {
                        context.unregisterReceiver(receiver)
                    } catch (e: IllegalArgumentException) {
                        // Receiver was not registered, ignore
                    }
                }
                bluetoothStateReceiver = null
            }
            
            return OperationResult(success = true, error = null)
        } catch (e: Exception) {
            return OperationResult(success = false, error = "Error unsubscribing from state changes: ${e.message}")
        }
    }

    override fun openSettings(): Promise<Unit> {
        val promise = Promise<Unit>()
        try {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            appContext?.let { ctx ->
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
                promise.resolve(Unit)
            } ?: promise.reject(Exception("Context not available"))
        } catch (e: Exception) {
            promise.reject(Exception("Error opening Bluetooth settings: ${e.message}"))
        }
        return promise
    }
}