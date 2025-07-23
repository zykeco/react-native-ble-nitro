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
    
    // Autolinking handles the Nitro registration automatically
}