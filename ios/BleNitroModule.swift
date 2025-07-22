///
/// BleNitroModule.swift  
/// React Native BLE Nitro - iOS Module Registration
/// Copyright © 2025 Zyke (https://zyke.co)
///

import Foundation
import NitroModules

@objc(BleNitroModule)
public class BleNitroModule: NSObject {
    
    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    public func constantsToExport() -> [String: Any] {
        return [:]
    }
}

/**
 * Nitro module factory for creating BLE manager instances
 */
@_cdecl("create_ble_nitro_manager")
public func createBleNitroManager() -> UnsafeMutableRawPointer {
    let manager = BleNitroBleManager()
    return Unmanaged.passRetained(manager).toOpaque()
}