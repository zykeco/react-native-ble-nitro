package com.margelo.nitro.co.zyke.ble

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.margelo.nitro.core.*

/**
 * Android implementation of the BLE Nitro Module
 * This class provides the actual BLE functionality for Android devices
 */
class BleNitroBleManager : HybridNativeBleNitroSpec() {
    
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var stateCallback: ((state: BLEState) -> Unit)? = null
    private var bluetoothStateReceiver: BroadcastReceiver? = null
    
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

    // Scanning operations
    override fun startScan(filter: ScanFilter, callback: (device: BLEDevice) -> Unit) {
        // TODO: Implement BLE scanning
    }

    override fun stopScan(): Boolean {
        // TODO: Implement stop scanning
        return false
    }

    override fun isScanning(): Boolean {
        // TODO: Implement scanning state check
        return false
    }

    // Device discovery
    override fun getConnectedDevices(services: Array<String>): Array<BLEDevice> {
        // TODO: Implement get connected devices
        return emptyArray()
    }

    // Connection management
    override fun connect(
        deviceId: String,
        callback: (success: Boolean, deviceId: String, error: String) -> Unit,
        disconnectCallback: ((deviceId: String, interrupted: Boolean, error: String) -> Unit)?
    ) {
        // TODO: Implement device connection
        callback(false, deviceId, "Not implemented")
    }

    override fun disconnect(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        // TODO: Implement device disconnection
        callback(false, "Not implemented")
    }

    override fun isConnected(deviceId: String): Boolean {
        // TODO: Implement connection state check
        return false
    }

    override fun requestMTU(deviceId: String, mtu: Double): Double {
        // TODO: Implement MTU request
        return 0.toDouble()
    }

    // Service discovery
    override fun discoverServices(deviceId: String, callback: (success: Boolean, error: String) -> Unit) {
        // TODO: Implement service discovery
        callback(false, "Not implemented")
    }

    override fun getServices(deviceId: String): Array<String> {
        // TODO: Implement get services
        return emptyArray()
    }

    override fun getCharacteristics(deviceId: String, serviceId: String): Array<String> {
        // TODO: Implement get characteristics
        return emptyArray()
    }

    // Characteristic operations
    override fun readCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, data: ArrayBuffer, error: String) -> Unit
    ) {
        // TODO: Implement characteristic read
        callback(false, ArrayBuffer.allocate(0), "Not implemented")
    }

    override fun writeCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        data: ArrayBuffer,
        withResponse: Boolean,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        // TODO: Implement characteristic write
        callback(false, "Not implemented")
    }

    override fun subscribeToCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        updateCallback: (characteristicId: String, data: ArrayBuffer) -> Unit,
        resultCallback: (success: Boolean, error: String) -> Unit
    ) {
        // TODO: Implement characteristic subscription
        resultCallback(false, "Not implemented")
    }

    override fun unsubscribeFromCharacteristic(
        deviceId: String,
        serviceId: String,
        characteristicId: String,
        callback: (success: Boolean, error: String) -> Unit
    ) {
        // TODO: Implement characteristic unsubscription
        callback(false, "Not implemented")
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