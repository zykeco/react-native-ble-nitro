package com.margelo.nitro.co.zyke.ble

import android.content.Context
import com.margelo.nitro.core.HybridObject
import com.margelo.nitro.core.NitroModules

class BleNitroPackage {
    companion object {
        fun install(context: Context) {
            NitroModules.createHybridObject("NativeBleNitro") { 
                NativeBleNitro(context) as HybridObject
            }
        }
    }
}