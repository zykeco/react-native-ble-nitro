package com.margelo.nitro.co.zyke.ble

import android.util.Log
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.TurboReactPackage

class BleNitroPackage : TurboReactPackage() {
    
    private var contextSet = false
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        // Set context if not already set
        if (!contextSet) {
            BleNitroBleManager.setContext(reactContext)
            contextSet = true
        }
        return null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { HashMap() }
    }

    // Override this method to ensure context is set during package initialization
    override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> {
        // Set context during package creation
        BleNitroBleManager.setContext(reactContext)
        return super.createNativeModules(reactContext).toMutableList()
    }

    companion object {
        init {
            BleNitroOnLoad.initializeNative()
        }
    }
}