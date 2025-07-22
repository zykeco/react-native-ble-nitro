/**
 * BleNitroPackage.kt
 * React Native BLE Nitro - Android Package Registration
 * Copyright © 2025 Zyke (https://zyke.co)
 */

package co.zyke.ble

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.NitroModules

/**
 * React Native package for BLE Nitro
 * Registers the Nitro module factory with React Native
 */
class BleNitroPackage : ReactPackage {
    
    companion object {
        init {
            // Register the Nitro module factory
            NitroModules.registerModule("BleNitroManager") { context ->
                BleNitroBleManager(context as ReactApplicationContext)
            }
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList() // Nitro modules don't use traditional NativeModules
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}