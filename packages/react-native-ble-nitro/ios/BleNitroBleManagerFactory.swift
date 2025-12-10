import Foundation
import NitroModules

/**
 * iOS Factory implementation for BLE Nitro Manager
 * Creates BleNitroBleManager instances with optional state restoration configuration
 */
public class BleNitroBleManagerFactory: HybridNativeBleNitroFactorySpec_base, HybridNativeBleNitroFactorySpec_protocol {

    public func create(
        nativeRestoreStateIdentifier: String?,
        restoreStateCallback: (([BLEDevice]) -> Void)?
    ) throws -> any HybridNativeBleNitroSpec {
        return BleNitroBleManager(
            restoreStateIdentifier: nativeRestoreStateIdentifier,
            restoreStateCallback: restoreStateCallback
        )
    }
}
