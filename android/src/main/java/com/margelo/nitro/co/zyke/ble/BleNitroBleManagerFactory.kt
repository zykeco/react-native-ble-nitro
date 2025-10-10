package com.margelo.nitro.co.zyke.ble

import com.margelo.nitro.core.*

/**
 * Android Factory implementation for BLE Nitro Manager
 * Creates BleNitroBleManager instances
 *
 * Note: restoreStateIdentifier and restoreStateCallback are iOS-specific
 * and ignored on Android
 */
class BleNitroBleManagerFactory : HybridNativeBleNitroFactorySpec() {

    override fun create(
        nativeRestoreStateIdentifier: String?,
        restoreStateCallback: ((peripherals: Array<BLEDevice>) -> Unit)?
    ): HybridNativeBleNitroSpec {
        // Ignore iOS-specific parameters on Android
        return BleNitroBleManager()
    }
}
