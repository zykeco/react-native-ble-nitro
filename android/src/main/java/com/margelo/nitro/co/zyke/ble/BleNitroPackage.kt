package com.margelo.nitro.co.zyke.ble

import android.util.Log
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.TurboReactPackage

class BleNitroPackage : TurboReactPackage() {
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        // Initialize the context for BleNitroBleManager
        BleNitroBleManager.setContext(reactContext)
        return null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { HashMap() }
    }

    companion object {
        init {
            BleNitroOnLoad.initializeNative()
        }
    }
}