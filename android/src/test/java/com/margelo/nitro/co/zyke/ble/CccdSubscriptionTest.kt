package com.margelo.nitro.co.zyke.ble

import android.bluetooth.BluetoothGattCharacteristic
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for [cccdSubscriptionMode].
 *
 * `PROPERTY_NOTIFY` and `PROPERTY_INDICATE` are compile-time `int` constants and
 * are inlined by the compiler, so these tests run on the plain JVM without
 * Robolectric or a connected device.
 */
class CccdSubscriptionTest {
    private val notify = BluetoothGattCharacteristic.PROPERTY_NOTIFY
    private val indicate = BluetoothGattCharacteristic.PROPERTY_INDICATE
    private val read = BluetoothGattCharacteristic.PROPERTY_READ

    @Test
    fun notifyOnly_usesNotify() {
        assertEquals(CccdSubscriptionMode.NOTIFY, cccdSubscriptionMode(notify))
    }

    @Test
    fun indicateOnly_usesIndicate() {
        assertEquals(CccdSubscriptionMode.INDICATE, cccdSubscriptionMode(indicate))
    }

    @Test
    fun supportsBoth_prefersNotify() {
        assertEquals(CccdSubscriptionMode.NOTIFY, cccdSubscriptionMode(notify or indicate))
    }

    @Test
    fun indicateWithOtherProperties_usesIndicate() {
        assertEquals(CccdSubscriptionMode.INDICATE, cccdSubscriptionMode(indicate or read))
    }

    @Test
    fun neitherNotifyNorIndicate_isUnsupported() {
        assertEquals(CccdSubscriptionMode.UNSUPPORTED, cccdSubscriptionMode(read))
    }

    @Test
    fun noProperties_isUnsupported() {
        assertEquals(CccdSubscriptionMode.UNSUPPORTED, cccdSubscriptionMode(0))
    }
}
