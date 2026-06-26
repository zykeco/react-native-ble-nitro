package com.margelo.nitro.co.zyke.ble

import android.bluetooth.BluetoothGattCharacteristic

/**
 * The delivery mode to request via the CCCD descriptor when subscribing to a
 * characteristic, derived from the characteristic's declared properties.
 */
internal enum class CccdSubscriptionMode {
    /** Use ENABLE_NOTIFICATION_VALUE (unacknowledged delivery). */
    NOTIFY,

    /** Use ENABLE_INDICATION_VALUE (acknowledged delivery). */
    INDICATE,

    /** The characteristic supports neither notify nor indicate. */
    UNSUPPORTED,
}

/**
 * Selects the CCCD subscription mode for a characteristic's [properties] bitmask.
 *
 * Notification is preferred when the characteristic supports both notify and
 * indicate because it is unacknowledged and lower-overhead. Indication is used
 * only for indicate-only characteristics. This mirrors iOS CoreBluetooth, where
 * `setNotifyValue(true)` automatically selects the appropriate delivery mode.
 *
 * [properties] is the value of [BluetoothGattCharacteristic.getProperties].
 */
internal fun cccdSubscriptionMode(properties: Int): CccdSubscriptionMode {
    val supportsNotify = (properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0
    val supportsIndicate = (properties and BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0
    return when {
        supportsNotify -> CccdSubscriptionMode.NOTIFY
        supportsIndicate -> CccdSubscriptionMode.INDICATE
        else -> CccdSubscriptionMode.UNSUPPORTED
    }
}
