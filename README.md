# react-native-ble-nitro

[![npm version](https://badge.fury.io/js/react-native-ble-nitro.svg)](https://badge.fury.io/js/react-native-ble-nitro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance React Native BLE library built on [Nitro Modules](https://nitro.margelo.com/).

Originally developed for [Zyke Band](https://zykeband.com?utm_source=github&utm_medium=readme&utm_campaign=opensource) - a fitness and health tracker created by a small team.

## ✨ Features

- 🚀 **High Performance**: Built on Nitro Modules with JSI for zero-overhead native communication
- 📱 **iOS Support**: Complete iOS implementation with Swift and Core Bluetooth
- 🤖 **Android Support**: Complete Android implementation with Kotlin and Android BLE APIs
- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 📡 **Advertisement Data**: Extract advertised service data and manufacturer data from scan results
- 🔧 **Expo Ready**: Built-in Expo config plugin for easy setup
- 🏗️ **New Architecture**: Full support for React Native's new architecture
- ⚡ **Zero Bridge**: Direct JSI communication eliminates bridge bottlenecks
- 🛡️ **Reliable**: Swift native implementation for maximum stability

## 🚀 Quick Start

### Installation

```bash
npm install react-native-nitro-modules react-native-ble-nitro
```

### Expo Setup

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-nitro",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ]
    ]
  }
}
```

Then prebuild and run:

```bash
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

### React Native CLI Setup

For bare React Native projects, the library auto-links. Just run:

```bash
npx pod-install # iOS only
```

## 📖 Usage

### Basic Setup

```typescript
import { BleNitro, BleNitroManager, BLEState, AndroidScanMode, AndroidConnectionPriority, type BLEDevice } from 'react-native-ble-nitro';

// Get the singleton instance
const ble = BleNitro.instance();

// Use custom manager instance (e.g. for iOS state restoration)
// It is recommended to create this instance in an extra file seperated from other BLE business logic for better fast-refresh support
const ble = new BleNitroManager({
  restoreIdentifier: 'my-unique-identifier',
  onRestoredState: (peripherals) => {
    console.log('Restored peripherals:', peripherals);
  },
});
```

### Complete API Reference

#### 🔌 Bluetooth State Management

```typescript
// Check if Bluetooth is enabled
const isEnabled = ble.isBluetoothEnabled();

// Get current Bluetooth state
const state = ble.state();
// Returns: BLEState.PoweredOn, BLEState.PoweredOff, etc.

// Request to enable Bluetooth (Android only; rejects with OPERATION_NOT_SUPPORTED on iOS)
await ble.requestBluetoothEnable();

// Subscribe to state changes
const subscription = ble.subscribeToStateChange((state) => {
  console.log('Bluetooth state changed:', state);
}, true); // true = emit initial state

// Unsubscribe from state changes
subscription.remove();

// Open Bluetooth settings
await ble.openSettings();

// Explicitly initialize BLE on iOS (optional, iOS only)
// Useful to trigger the Bluetooth permission dialog at a specific moment
// when using lazy iOS initialization.
ble.iosLazyInit();
```

#### 🔍 Device Scanning

```typescript
// Start scanning for devices
ble.startScan({
  serviceUUIDs: ['180d'], // Optional: filter by service UUIDs
  rssiThreshold: -80,     // Optional: minimum signal strength
  allowDuplicates: false, // Optional: allow duplicate discoveries
  androidScanMode: AndroidScanMode.Balanced // Optional: Android scan mode
}, (device) => {
  console.log('Discovered device:', device);

  // Advertised service data, keyed by service UUID (ArrayBuffer payloads)
  device.serviceData.services.forEach(({ uuid, data }) => {
    console.log(`Service data for ${uuid}:`, new Uint8Array(data));
  });

  // Advertised manufacturer data, keyed by company identifier
  device.manufacturerData.companyIdentifiers.forEach(({ id, data }) => {
    console.log(`Manufacturer data for ${id}:`, new Uint8Array(data));
  });
}, (error) => {
  // Called once if the scan can't start or fails; scanning has stopped by then
  console.error('Scan error:', error.domain, error.code, error.message);
});

// Stop scanning
ble.stopScan();

// Check if currently scanning
const isScanning = ble.isScanning();

// Get already connected devices
const connectedDevices = ble.getConnectedDevices(['180d']); // Optional: filter by service UUIDs
```

#### 🔗 Device Connection

```typescript
// Connect to a device with disconnect event handling
const deviceId = await ble.connect(deviceId, (deviceId, interrupted, error) => {
  if (interrupted) {
    console.log('Connection interrupted:', error);
    // Handle unexpected disconnection (out of range, etc.)
  } else {
    console.log('Disconnected intentionally');
    // Handle normal disconnection
  }
});

// Connect without disconnect callback
const deviceId = await ble.connect(deviceId);

// You can also use findAndConnect to scan and connect in one step
// This could be useful for reconnecting after app restart or when device was disconnected unexpectedly
const deviceId = await ble.findAndConnect(deviceId, {
  scanTimeout: 4000, // default 5000ms
  onDisconnect: (deviceId, interrupted, error) => {
    if (interrupted) {
      console.log('Connection interrupted:', error);
      // Handle unexpected disconnection (out of range, etc.)
    } else {
      console.log('Disconnected intentionally');
      // Handle normal disconnection
    }
  }
});

// Disconnect from a device
await ble.disconnect(deviceId);

// Check connection status
const isConnected = ble.isConnected(deviceId);

// MTU negotiation (Android only, as iOS manages MTU automatically)
// iOS returns current MTU size
const mtu = await ble.requestMTU(deviceId, 256); // Request MTU size

// MTU negotiation (Android only)
// iOS manages MTU automatically, this method returns current MTU size
const newMTU = ble.requestMTU(deviceId, 247);
console.log('MTU set to:', newMTU);

// Request Android connection priority while connected (Android only).
// Returns true if Android successfully initiated the request (the priority change
// is applied asynchronously); returns false on iOS, an error, or a disconnected device.
const priorityRequested = ble.requestConnectionPriority(deviceId, AndroidConnectionPriority.High);

// AndroidConnectionPriority options:
//   AndroidConnectionPriority.High      → lower latency, higher power usage
//   AndroidConnectionPriority.Balanced  → default balanced connection interval
//   AndroidConnectionPriority.LowPower  → higher latency, lower power usage
ble.requestConnectionPriority(deviceId, AndroidConnectionPriority.Balanced);
ble.requestConnectionPriority(deviceId, AndroidConnectionPriority.LowPower);

// Read RSSI value
const rssi = await ble.readRSSI(deviceId);
console.log('Current RSSI:', rssi);
```

#### 🔧 Service Discovery

```typescript
// Discover all services for a device
await ble.discoverServices(deviceId);

// Get discovered services
const services = await ble.getServices(deviceId);
// Returns: ['0000180d-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb', ...] 
// Always returns full 128-bit UUIDs

// Get characteristics for a service
const characteristics = ble.getCharacteristics(deviceId, serviceUUID);
// Returns: ['00002a37-0000-1000-8000-00805f9b34fb', '00002a38-0000-1000-8000-00805f9b34fb', ...] 
// Always returns full 128-bit UUIDs

// Note: You can use either short or long form UUIDs as input:
const characteristics1 = ble.getCharacteristics(deviceId, '180d'); // Short form
const characteristics2 = ble.getCharacteristics(deviceId, '0000180d-0000-1000-8000-00805f9b34fb'); // Long form
// Both work identically - conversion handled automatically

// Get services with their characteristics
const servicesWithCharacteristics = await ble.getServicesWithCharacteristics(deviceId);
// Returns: [{ uuid: '0000180d-0000-1000-8000-00805f9b34fb', characteristics: ['00002a37-0000-1000-8000-00805f9b34fb', ...] }, ...]
```

#### 📖 Reading Characteristics

```typescript
// Read a characteristic value
const data = await ble.readCharacteristic(deviceId, serviceUUID, characteristicUUID);
// Returns: ArrayBuffer - binary data

// Example: Reading battery level
const batteryData = await ble.readCharacteristic(deviceId, '180f', '2a19');
const batteryLevel = batteryData[0]; // First byte is battery percentage
console.log('Battery level:', batteryLevel + '%');
```

#### ✍️ Writing Characteristics

```typescript
// Write to a characteristic with response
const data = [0x01, 0x02, 0x03];
const result = await ble.writeCharacteristic(
  deviceId, 
  serviceUUID, 
  characteristicUUID, 
  data, // Data as ArrayBuffer
  true // withResponse = true (default)
);
// result is array of integers (may be empty depending on characteristic)
// Android returns the written data if withResponse=true and characteristic returns no data, on iOS it is an empty array

// Write without response (faster, no confirmation)
const emptyResult = await ble.writeCharacteristic(
  deviceId, 
  serviceUUID, 
  characteristicUUID, 
  data,
  false // withResponse = false
);
// emptyResult is always empty array
```

#### 📡 Characteristic Notifications

> [!CAUTION]
> **From version 1.8.0** on the returned subscription object has the type `AsyncSubscription` instead of `Subscription` to indicate that the `remove` method is now async and returns a Promise for better multi-platform compatibility.
> **From version 1.9.0** on the `subscribeToCharacteristic` method is async, so use await when calling it. This was introduced to fix the handling of gatt queuing on Android.

> [!IMPORTANT]  
> It is only possible to have one active notification subscription per specific characteristic. If you call `subscribeToCharacteristic` again for the same characteristic, the previous subscription won't receive any more updates and should be removed previously.

```typescript
// Subscribe to characteristic notifications
const subscription = await ble.subscribeToCharacteristic( // before 1.9.0 this was synchronous
  deviceId,
  serviceUUID,
  characteristicUUID,
  (characteristicId, data) => {
    console.log('Received notification:', data);
    // Handle incoming data
  }
);

// Unsubscribe from notifications
await subscription.remove();

// Or unsubscribe directly
await ble.unsubscribeFromCharacteristic(deviceId, serviceUUID, characteristicUUID);

// Check if a characteristic is currently subscribed to notifications
const isSubscribed = ble.isSubscribedToCharacteristic(deviceId, serviceUUID, characteristicUUID);
// Returns: boolean — synchronous, no async overhead
// Returns false for disconnected or unknown devices without throwing
```

### Real-World Examples

#### Heart Rate Monitor

```typescript
const HEART_RATE_SERVICE = '180d';
const HEART_RATE_MEASUREMENT = '2a37';

// Connect and subscribe to heart rate
const autoConnectOnAndroid = true; // Optional: auto-reconnect on Android
const deviceId = await ble.connect(
  heartRateDeviceId,
  (deviceId, interrupted, error) => {
    console.log('Device got Disconnected');
    console.log('Was Interrupted?', interrupted);
    console.log('Error:', error);
  },
  autoConnectOnAndroid,
);
ble.requestConnectionPriority(deviceId, AndroidConnectionPriority.High);
await ble.discoverServices(deviceId);

const subscription = await ble.subscribeToCharacteristic(
  deviceId,
  HEART_RATE_SERVICE,
  HEART_RATE_MEASUREMENT,
  (_, data) => {
    const heartRate = data[1]; // Second byte contains BPM
    console.log('Heart rate:', heartRate, 'BPM');
  }
);

// Unsubscribe when done
await subscription.remove();
```

#### Battery Level Reading

```typescript
const BATTERY_SERVICE = '180f';
const BATTERY_LEVEL_CHARACTERISTIC = '2a19';

const batteryData = await ble.readCharacteristic(
  deviceId,
  BATTERY_SERVICE,
  BATTERY_LEVEL_CHARACTERISTIC
);
const batteryPercentage = batteryData[0];
console.log('Battery:', batteryPercentage + '%');
```

#### Custom Device Control

```typescript
const CUSTOM_SERVICE = 'your-custom-service-uuid';
const COMMAND_CHARACTERISTIC = 'your-command-characteristic-uuid';

// Send a custom command
const enableLedCommand = [0x01, 0x1f, 0x01]; // Your protocol
await ble.writeCharacteristic(
  deviceId,
  CUSTOM_SERVICE,
  COMMAND_CHARACTERISTIC,
  enableLedCommand
);
```

### UUID Handling

**🔧 Automatic UUID Conversion**

This library automatically handles UUID conversion between 16-bit, 32-bit, and 128-bit formats:

```typescript
// All input methods accept both short and long form UUIDs:
await ble.readCharacteristic(deviceId, '180d', '2a19');           // Short form ✅
await ble.readCharacteristic(deviceId, '0000180d-0000-1000-8000-00805f9b34fb', '00002a19-0000-1000-8000-00805f9b34fb'); // Long form ✅

// All output methods return full 128-bit UUIDs:
const services = await ble.getServices(deviceId);
// Always returns: ['0000180d-0000-1000-8000-00805f9b34fb', ...] 

// Conversion happens automatically on the native side for maximum performance
```

### Utility Functions

```typescript
// Manually normalize UUIDs to full 128-bit format (rarely needed)
const fullUUID = BleNitro.normalizeGattUUID('180d');
// Returns: '0000180d-0000-1000-8000-00805f9b34fb'

// Normalize multiple UUIDs
const fullUUIDs = BleNitro.normalizeGattUUIDs(['180d', '180f']);
// Returns: ['0000180d-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb']
```

### Error Handling

Every failed Bluetooth operation reports an error object extending `BleErrorBase`. It comes as a rejected promise from an async method, a throw from `getCharacteristics`, or the error argument of a failure callback (`startScan`'s `onError`, `connect`'s disconnect callback). The few APIs that report failure another way are listed under [Failures that aren't error objects](#failures-that-arent-error-objects).

Each error carries `domain`, `code` and `message`, and is one of two classes. The class tells you **who reported the failure**:

| Class | Raised when | `domain` | `code` |
|---|---|---|---|
| `BleNitroError` | The library detected or decided the failure itself: a guard clause (device not connected, unknown service or characteristic, Bluetooth unavailable, …), a link lost mid-operation, a timeout, or a platform failure that came without an error code | always `BLE_NITRO_LIBRARY_DOMAIN` (`'bleNitro.library'`) | a `BleNitroLibraryErrorCode`, a typed enum exported from the package |
| `BlePlatformError` | The platform or the peripheral rejected the operation with its own error code | the raw platform namespace: `CBErrorDomain` / `CBATTErrorDomain` on iOS, `android.bluetoothGatt.connection` / `android.bluetoothGatt.operation` / `android.bluetoothLe.scan` on Android | the raw `NSError` code, GATT status, or scan error code |

`BleTimeoutError` is a `BleNitroError` whose `code` is always `TIMEOUT`.

`message` is human-readable text for logging only. Never parse it to drive logic; branch on the class and `code` instead:

```typescript
import { BleNitroError, BlePlatformError, BleNitroLibraryErrorCode } from 'react-native-ble-nitro';

try {
  await ble.readCharacteristic(deviceId, serviceId, characteristicId);
} catch (error) {
  if (error instanceof BleNitroError && error.code === BleNitroLibraryErrorCode.DEVICE_NOT_CONNECTED) {
    // reconnect and retry
  } else if (error instanceof BlePlatformError && error.domain === 'android.bluetoothGatt.operation' && error.code === 8) {
    // GATT_INSUFFICIENT_AUTHORIZATION: start pairing
  }
}
```

> **Upgrading from 1.15.x or earlier:** failures used to be plain `Error` objects, and callbacks received strings, so the message text was the only information. If your code compares `error.message` or the callback string (for example against `'Device not connected'`), switch to the class and `code`. `startScan`'s `onError` and `connect`'s disconnect callback now receive an error object instead of a string.

#### Errors by method

Every method that needs a connection checks it in JS first and rejects with `DEVICE_NOT_CONNECTED`; `getCharacteristics` throws it instead. Any callback-based method can also reject with `UNKNOWN` if the native side reports a failure without an error object. On top of that, each method can report:

| Method | iOS | Android |
|---|---|---|
| `startScan` → `onError` | `BLUETOOTH_UNAVAILABLE`, `PERMISSION_DENIED` | `BLUETOOTH_UNAVAILABLE`, `PERMISSION_DENIED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothLe.scan` |
| `connect` | `DEVICE_NOT_FOUND`, `UNKNOWN`<br>platform: `CBErrorDomain` | `BLUETOOTH_UNAVAILABLE`, `DEVICE_NOT_FOUND`, `CONTEXT_UNAVAILABLE`, `PERMISSION_DENIED`, `NATIVE_EXCEPTION`, `UNKNOWN`<br>platform: `android.bluetoothGatt.connection` |
| `connect` → disconnect callback | platform: `CBErrorDomain`; `undefined` after an intentional disconnect | platform: `android.bluetoothGatt.connection`; `undefined` after an intentional disconnect |
| `findAndConnect` | everything `startScan` and `connect` report, plus `TIMEOUT` if the device isn't found in time | same as iOS |
| `disconnect` | `DEVICE_NOT_CONNECTED`<br>platform: `CBErrorDomain` | `DEVICE_NOT_CONNECTED`, `NATIVE_EXCEPTION` |
| `readRSSI` | `CONNECTION_STATE_NOT_FOUND`<br>platform: `CBErrorDomain`, `CBATTErrorDomain` | `OPERATION_INITIATION_FAILED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `discoverServices`, `getServices` | `CONNECTION_STATE_NOT_FOUND`<br>platform: `CBErrorDomain`, `CBATTErrorDomain` | `CONNECTION_STATE_NOT_FOUND`, `OPERATION_INITIATION_FAILED`, `DISCONNECTED_DURING_OPERATION`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `getServicesWithCharacteristics` | as `discoverServices`, plus `SERVICES_CHANGED` and `TIMEOUT` | as `discoverServices`, plus `TIMEOUT` |
| `readCharacteristic` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CONNECTION_STATE_NOT_FOUND`, `DATA_ERROR`<br>platform: `CBATTErrorDomain`, `CBErrorDomain` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `OPERATION_INITIATION_FAILED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `writeCharacteristic` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CONNECTION_STATE_NOT_FOUND`<br>platform: `CBATTErrorDomain`, `CBErrorDomain` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `OPERATION_INITIATION_FAILED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `subscribeToCharacteristic` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CONNECTION_STATE_NOT_FOUND`, `UNKNOWN`<br>platform: `CBATTErrorDomain`, `CBErrorDomain` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CHARACTERISTIC_NOT_SUPPORTED`, `OPERATION_INITIATION_FAILED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `unsubscribeFromCharacteristic` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `CONNECTION_STATE_NOT_FOUND`, `UNKNOWN`<br>platform: `CBATTErrorDomain`, `CBErrorDomain` | `SERVICE_NOT_FOUND`, `CHARACTERISTIC_NOT_FOUND`, `OPERATION_INITIATION_FAILED`, `NATIVE_EXCEPTION`<br>platform: `android.bluetoothGatt.operation` |
| `requestBluetoothEnable` | `OPERATION_NOT_SUPPORTED`, always | `BLUETOOTH_UNAVAILABLE`, `CONTEXT_UNAVAILABLE`, `PERMISSION_DENIED`, `NATIVE_EXCEPTION` |

The `remove()` of a subscription returned by `subscribeToCharacteristic` never rejects; it ignores unsubscribe failures.

#### BleNitroError codes

The enum member alone tells you what happened:

| Code | Raised on | Meaning and suggested reaction |
|---|---|---|
| `UNKNOWN` (0) | iOS, Android, JS | A failure without further detail: iOS `didFailToConnect` without an `NSError`, an Android connection attempt that failed with status 0, an iOS subscribe or unsubscribe that didn't reach the requested state, or a native failure reported without any error. Log it; retrying may help. |
| `DEVICE_NOT_CONNECTED` (1) | iOS, Android, JS | The device isn't connected. Reconnect and retry. |
| `DEVICE_NOT_FOUND` (2) | iOS, Android | `connect()` was given an identifier iOS doesn't know, or a malformed Android address. Scan for the device first. |
| `SERVICE_NOT_FOUND` (3) | iOS, Android | The connected device has no service with that UUID, or services haven't been discovered yet. Check the UUID or run service discovery; retrying alone won't help. |
| `CHARACTERISTIC_NOT_FOUND` (4) | iOS, Android | The service has no characteristic with that UUID. Same reaction as above. |
| `PERMISSION_DENIED` (5) | iOS (scan), Android | A Bluetooth permission is missing. Ask the user to grant it. |
| `BLUETOOTH_UNAVAILABLE` (6) | iOS (scan), Android | Bluetooth is off or unsupported. Ask the user to turn Bluetooth on. |
| `CONTEXT_UNAVAILABLE` (7) | Android | No Android `Context` was available yet. Retry once the app has started. |
| `OPERATION_INITIATION_FAILED` (8) | Android | Android refused to start the GATT operation, usually because another one is in flight. Retry shortly. |
| `CONNECTION_STATE_NOT_FOUND` (9) | iOS, Android | The device is connected, but the library holds no state for that connection (e.g. it was connected outside this library, or teardown is in progress). Call `connect()` again. |
| `DISCONNECTED_DURING_OPERATION` (10) | Android | The link dropped before service discovery completed. Reconnect and retry. |
| `DATA_ERROR` (11) | iOS | A read completed, but its value was missing or unreadable. Retry the read. |
| `NATIVE_EXCEPTION` (12) | Android | The Android Bluetooth stack threw unexpectedly; `message` holds the exception text. |
| `CONNECTION_CANCELLED` (13) | iOS, Android (native only) | Reserved for a disconnect that cancels a pending connection. The public API doesn't raise it yet: `disconnect()` resolves without cancelling anything while the device isn't connected. |
| `CHARACTERISTIC_NOT_SUPPORTED` (14) | Android | The characteristic supports neither notify nor indicate, so it can't be subscribed to. |
| `OPERATION_NOT_SUPPORTED` (15) | iOS | The operation isn't available on this platform: `requestBluetoothEnable()` on iOS. |
| `SERVICES_CHANGED` (16) | iOS | The peripheral changed its services during discovery. Run discovery again. |
| `TIMEOUT` (17) | JS | The operation didn't finish in time: the `findAndConnect` scan (default 5 s), or service and characteristic discovery (30 s). Raised as `BleTimeoutError`. |

#### BlePlatformError codes

Always react on `domain` and `code` **together**. The same number means different things in different namespaces, so the code alone is ambiguous:

- `android.bluetoothGatt.connection` + `8` — `GATT_CONN_TIMEOUT`; the link is gone, reconnect.
- `android.bluetoothGatt.operation` + `8` — `GATT_INSUFFICIENT_AUTHORIZATION`; the peripheral wants a bonded connection, start pairing.
- `CBErrorDomain` + `6` — the iOS equivalent of a connection timeout.
- `CBATTErrorDomain` + `5` — the iOS equivalent of insufficient authentication.

This library deliberately does not interpret or re-classify platform codes; it only guarantees the raw `domain`/`code`/`message` triple reaches you intact. The tables below list every code each domain defines, as a reference; the platform documentation stays the source of truth.

<details>
<summary><b><code>CBErrorDomain</code></b> (iOS): Core Bluetooth errors</summary>

From [`CBError.Code`](https://developer.apple.com/documentation/corebluetooth/cberror-swift.struct/code).

| Code | `CBError.Code` | Meaning |
|---|---|---|
| 0 | `unknown` | An unknown error occurred. |
| 1 | `invalidParameters` | The specified parameters are invalid. |
| 2 | `invalidHandle` | The specified attribute handle is invalid. |
| 3 | `notConnected` | The device isn't currently connected. |
| 4 | `outOfSpace` | The device has run out of space to complete the operation. |
| 5 | `operationCancelled` | The operation was cancelled. |
| 6 | `connectionTimeout` | The connection timed out. |
| 7 | `peripheralDisconnected` | The peripheral disconnected. |
| 8 | `uuidNotAllowed` | The specified UUID isn't permitted. |
| 9 | `alreadyAdvertising` | The peripheral is already advertising. Peripheral role only; this library doesn't raise it. |
| 10 | `connectionFailed` | The connection failed. |
| 11 | `connectionLimitReached` | The device already has the maximum number of connections. |
| 12 | `unknownDevice` | The device is unknown. |
| 13 | `operationNotSupported` | The operation isn't supported. |
| 14 | `peerRemovedPairingInformation` | The peripheral deleted its pairing information. The user usually has to forget the device in iOS Settings → Bluetooth before it can pair again. |
| 15 | `encryptionTimedOut` | Encrypting the link timed out. |
| 16 | `tooManyLEPairedDevices` | Too many LE devices are paired with this device. |

Codes 17–20 are watchOS-only or belong to Channel Sounding, which this library doesn't use.

</details>

<details>
<summary><b><code>CBATTErrorDomain</code></b> (iOS): errors returned by the peripheral</summary>

From [`CBATTError.Code`](https://developer.apple.com/documentation/corebluetooth/cbatterror-swift.struct/code). These are the Attribute Protocol (ATT) error codes of the Bluetooth Core Specification, so the same numbers appear in Android's `android.bluetoothGatt.operation` domain.

| Code | `CBATTError.Code` | Meaning |
|---|---|---|
| 1 | `invalidHandle` | The attribute handle is invalid on this peripheral. |
| 2 | `readNotPermitted` | The permissions prohibit reading the attribute's value. |
| 3 | `writeNotPermitted` | The permissions prohibit writing the attribute's value. |
| 4 | `invalidPdu` | The attribute Protocol Data Unit (PDU) is invalid. |
| 5 | `insufficientAuthentication` | Reading or writing failed for lack of authentication; the peripheral requires pairing. |
| 6 | `requestNotSupported` | The peripheral doesn't support the request. |
| 7 | `invalidOffset` | The offset was past the end of the attribute's value. |
| 8 | `insufficientAuthorization` | Reading or writing failed for lack of authorization. |
| 9 | `prepareQueueFull` | Too many write requests are queued. |
| 10 | `attributeNotFound` | The attribute wasn't found within the given handle range. |
| 11 | `attributeNotLong` | The attribute can't be read or written with a read blob request. |
| 12 | `insufficientEncryptionKeySize` | The link's encryption key size is insufficient. |
| 13 | `invalidAttributeValueLength` | The value's length is invalid for this operation. |
| 14 | `unlikelyError` | The request hit an unlikely error and wasn't completed. |
| 15 | `insufficientEncryption` | Reading or writing failed for lack of encryption; the peripheral requires an encrypted (paired) link. |
| 16 | `unsupportedGroupType` | The attribute type isn't a supported grouping attribute. |
| 17 | `insufficientResources` | The peripheral lacks the resources to complete the request. |

Other codes are defined by the peripheral itself: ATT reserves 128–159 (`0x80`–`0x9F`) for application errors and 224–255 (`0xE0`–`0xFF`) for common profile and service errors.

</details>

<details>
<summary><b><code>android.bluetoothGatt.operation</code></b> (Android): status of a GATT operation</summary>

The `status` Android passes to the read, write, descriptor-write (subscribe and unsubscribe), service-discovery and RSSI callbacks. Names starting with `BluetoothGatt.` are public [`BluetoothGatt`](https://developer.android.com/reference/android/bluetooth/BluetoothGatt) constants; the others come from AOSP's [`gatt_api.h`](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/system/stack/include/gatt_api.h). Codes 1–19 are ATT error codes returned by the peripheral (the same numbers as iOS's `CBATTErrorDomain`); codes from 128 up are mostly statuses of Android's own Bluetooth stack, although a peripheral can also return application errors in the 128–159 range.

| Code | Name | Meaning |
|---|---|---|
| 1 | `GATT_INVALID_HANDLE` | The attribute handle is invalid. |
| 2 | `BluetoothGatt.GATT_READ_NOT_PERMITTED` | GATT read operation is not permitted. |
| 3 | `BluetoothGatt.GATT_WRITE_NOT_PERMITTED` | GATT write operation is not permitted. |
| 4 | `GATT_INVALID_PDU` | The request PDU is invalid. |
| 5 | `BluetoothGatt.GATT_INSUFFICIENT_AUTHENTICATION` | Insufficient authentication; the peripheral requires pairing. |
| 6 | `BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED` | The request is not supported. |
| 7 | `BluetoothGatt.GATT_INVALID_OFFSET` | A read or write used an invalid offset. |
| 8 | `BluetoothGatt.GATT_INSUFFICIENT_AUTHORIZATION` | Insufficient authorization; usually the peripheral wants a bonded connection. |
| 9 | `GATT_PREPARE_Q_FULL` | Too many write requests are queued. |
| 10 | `GATT_NOT_FOUND` | The attribute wasn't found. |
| 11 | `GATT_NOT_LONG` | The attribute can't be read or written with a read blob request. |
| 12 | `GATT_INSUF_KEY_SIZE` | The link's encryption key size is insufficient. |
| 13 | `BluetoothGatt.GATT_INVALID_ATTRIBUTE_LENGTH` | A write exceeds the attribute's maximum length. |
| 14 | `GATT_ERR_UNLIKELY` | The peripheral hit an unlikely error. |
| 15 | `BluetoothGatt.GATT_INSUFFICIENT_ENCRYPTION` | Insufficient encryption; the peripheral requires an encrypted (paired) link. |
| 16 | `GATT_UNSUPPORT_GRP_TYPE` | The attribute type isn't a supported grouping type. |
| 17 | `GATT_INSUF_RESOURCE` | The peripheral lacks the resources for the request. |
| 18 | `GATT_DATABASE_OUT_OF_SYNC` | The cached GATT database is out of date. Run service discovery again. |
| 19 | `GATT_VALUE_NOT_ALLOWED` | The peripheral doesn't allow this value. |
| 128 | `GATT_NO_RESOURCES` | The Android Bluetooth stack is out of resources. |
| 129 | `GATT_INTERNAL_ERROR` | Internal error in the Android Bluetooth stack. |
| 130 | `GATT_WRONG_STATE` | The operation isn't valid in the current state. |
| 131 | `GATT_DB_FULL` | The GATT database is full. |
| 132 | `GATT_BUSY` | Another GATT operation is in progress. Retry later. |
| 133 | `GATT_ERROR` | Generic, unspecific failure. |
| 134 | `GATT_CMD_STARTED` | Command started (stack-internal status). |
| 135 | `GATT_ILLEGAL_PARAMETER` | An illegal parameter was passed. |
| 136 | `GATT_PENDING` | Operation pending (stack-internal status). |
| 137 | `GATT_AUTH_FAIL` | Authentication (pairing) failed. |
| 139 | `GATT_INVALID_CFG` | Invalid configuration. |
| 140 | `GATT_SERVICE_STARTED` | Service started (stack-internal status). |
| 141 | `GATT_ENCRYPED_NO_MITM` | The link is encrypted without MITM protection, which the attribute requires. |
| 142 | `GATT_NOT_ENCRYPTED` | The link isn't encrypted. |
| 143 | `BluetoothGatt.GATT_CONNECTION_CONGESTED` | The connection is congested. Retry later. |
| 144 | `GATT_DUP_REG` | Duplicate registration. |
| 145 | `GATT_ALREADY_OPEN` | Already open. |
| 146 | `GATT_CANCEL` | The operation was cancelled. |
| 147 | `BluetoothGatt.GATT_CONNECTION_TIMEOUT` | The GATT connection timed out. |
| 253 | `GATT_CCC_CFG_ERR` | The Client Characteristic Configuration Descriptor is improperly configured. |
| 254 | `GATT_PRC_IN_PROGRESS` | A procedure is already in progress. |
| 255 | `GATT_OUT_OF_RANGE` | The attribute value is out of range. |
| 257 | `BluetoothGatt.GATT_FAILURE` | A GATT operation failed for another reason. |

</details>

<details>
<summary><b><code>android.bluetoothGatt.connection</code></b> (Android): connection failures and disconnects</summary>

The `status` of `onConnectionStateChange`. It rejects a failed `connect()` and is passed to the disconnect callback after an unexpected disconnect. Most values are Bluetooth HCI disconnect reasons; AOSP's [`gatt_api.h`](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/system/stack/include/gatt_api.h) names the common ones. Other HCI reason codes from the Bluetooth Core Specification can appear too.

| Code | Name | Meaning |
|---|---|---|
| 1 | `GATT_CONN_L2C_FAILURE` | General L2CAP failure. |
| 8 | `GATT_CONN_TIMEOUT` | The link timed out: the peripheral went out of range or stopped responding. Reconnect. |
| 19 | `GATT_CONN_TERMINATE_PEER_USER` | The peripheral closed the connection. |
| 21 | `GATT_CONN_TERMINATED_POWER_OFF` | The peripheral closed the connection because it is powering off. |
| 22 | `GATT_CONN_TERMINATE_LOCAL_HOST` | This device's Bluetooth stack closed the connection. |
| 34 | `GATT_CONN_LMP_TIMEOUT` | The link-layer response timed out. |
| 62 | `GATT_CONN_FAILED_ESTABLISHMENT` | The connection could not be established. Retry. |
| 133 | `GATT_ERROR` | Generic, unspecific failure. Common when a connection attempt fails; retrying after a short delay often helps. |
| 147 | `BluetoothGatt.GATT_CONNECTION_TIMEOUT` | The connection timed out, likely because the peripheral is out of range or not advertising as connectable (Android 15+). |

</details>

<details>
<summary><b><code>android.bluetoothLe.scan</code></b> (Android): scan failures</summary>

The `errorCode` of [`ScanCallback.onScanFailed`](https://developer.android.com/reference/android/bluetooth/le/ScanCallback).

| Code | `ScanCallback` constant | Meaning |
|---|---|---|
| 1 | `SCAN_FAILED_ALREADY_STARTED` | A scan with the same settings is already running for this app. |
| 2 | `SCAN_FAILED_APPLICATION_REGISTRATION_FAILED` | The app couldn't be registered for scanning. |
| 3 | `SCAN_FAILED_INTERNAL_ERROR` | Internal error. |
| 4 | `SCAN_FAILED_FEATURE_UNSUPPORTED` | The device doesn't support power-optimized scanning. |
| 5 | `SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES` | The scan hardware is out of resources. |
| 6 | `SCAN_FAILED_SCANNING_TOO_FREQUENTLY` | The app started scans too often; Android throttles frequent scan starts. Wait before scanning again. |

</details>

#### Failures that aren't error objects

A few APIs report failure through their return value or don't report it at all:

- `requestMTU()` returns `-1` on iOS when the device isn't connected, and `0` on Android when the device isn't connected or the request can't be started.
- `requestConnectionPriority()` returns `false` when the request can't be started, and always on iOS.
- `isConnected()` and `isSubscribedToCharacteristic()` return `false` for unknown or disconnected devices.
- `openSettings()` rejects with a plain `Error` on Android if no `Context` is available or the settings screen can't be opened.
- `subscribeToStateChange()` doesn't report failures. On Android, if no `Context` is available, no state changes are delivered.
- Synchronous methods (`isScanning`, `getConnectedDevices`, `getCharacteristics`, `isSubscribedToCharacteristic`, …) throw a plain `Error` if the native layer throws unexpectedly.

### iOS Restore State

There is built-in support for iOS state restoration. You need to provide a unique identifier and a callback to handle restored peripherals. If no unique identifier is provided, state restoration is disabled.

> [!CAUTION]
> From 1.7.0 on you have to create your own instance of `BleNitroManager` if you want to use state restoration. The singleton `BleNitro.instance()` will not have state restoration enabled by default anymore.

```typescript
import { BleNitroManager, BLEDevice } from 'react-native-ble-nitro';

const customBleInstance = new BleNitroManager({
  restoreIdentifier: 'my-unique-identifier', // unique identifier for state restoration
  onRestoredState: (peripherals: BLEDevice[]) => {
    console.log('Restored peripherals:', peripherals);
    // Handle restored peripherals
  }
});
```

<details>
<summary><strong>Singleton Restore State before 1.7.0 (<= 1.6.0)</strong></summary>

```typescript
// Enable state restoration in BleNitro singleton
const ble = BleNitro.instance();
ble.onRestoredState((peripherals) => {
  console.log('Restored peripherals:', peripherals);
});
```
</details>

### TypeScript Types

```typescript
interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData: ManufacturerData;
  serviceData: ServiceData;
  serviceUUIDs: string[];
  isConnectable: boolean;
  isConnected: boolean;
}

// Advertised manufacturer-specific data, keyed by company identifier
interface ManufacturerData {
  companyIdentifiers: ManufacturerDataEntry[];
}

interface ManufacturerDataEntry {
  id: string;        // company identifier (hex)
  data: ArrayBuffer; // raw manufacturer payload
}

// Advertised service data, keyed by service UUID
interface ServiceData {
  services: ServiceDataEntry[];
}

interface ServiceDataEntry {
  uuid: string;      // service UUID
  data: ArrayBuffer; // raw service-data payload
}

interface ScanFilter {
  serviceUUIDs?: string[];
  rssiThreshold?: number;
  allowDuplicates?: boolean;
  androidScanMode?: AndroidScanMode;
}

interface Subscription {
  remove: () => Promise<void>;
}

interface AsyncSubscription {
  remove: () => Promise<void>;
}

enum BLEState {
  Unknown = 'Unknown',
  Resetting = 'Resetting', 
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn'
}

enum AndroidScanMode {
  LowLatency = 'LowLatency',        // Highest power, fastest discovery
  Balanced = 'Balanced',            // Balanced power/discovery (default)
  LowPower = 'LowPower',            // Lowest power, slower discovery  
  Opportunistic = 'Opportunistic',  // Only when other apps are scanning
}

enum AndroidConnectionPriority {
  Balanced = 'Balanced', // Balanced connection interval
  High = 'High',         // Lower latency, higher power
  LowPower = 'LowPower', // Lower power, higher latency
}

// Callback types
type StateChangeCallback = (state: BLEState) => void;
type ScanEventCallback = (device: BLEDevice) => void;
type ScanErrorCallback = (error: BleErrorBase) => void;
type DisconnectEventCallback = (deviceId: string, interrupted: boolean, error?: BleErrorBase) => void;
type CharacteristicUpdateCallback = (characteristicId: string, data: ArrayBuffer) => void;
```

## 🏗️ Architecture

### Nitro Modules Foundation

Built on [Nitro Modules](https://nitro.margelo.com/) for:

- **Direct JSI Communication**: No React Native bridge overhead
- **Type-Safe Bindings**: Compile-time type checking across JS/Native boundary  
- **High Performance**: Near-native performance for all operations
- **Memory Efficient**: Optimal memory management with smart references

### Platform Implementation

- **iOS**: ✅ Complete Swift implementation using Core Bluetooth
- **Android**: ✅ Complete Kotlin implementation using Android BLE APIs  
- **Shared C++**: Common logic and type definitions via Nitro Modules

## ⚙️ Configuration

### Expo Plugin Options

```typescript
interface BleNitroPluginProps {
  isBackgroundEnabled?: boolean;     // Enable background BLE support
  neverForLocation?: boolean;        // Assert no location derivation [Android 12+]
  modes?: ('peripheral' | 'central')[]; // iOS background modes
  bluetoothAlwaysPermission?: string | false; // iOS permission message
  androidAdvertisingEnabled?: boolean; // Android Peripheral mode (advertising)
  iOSLazyInit?: boolean;            // Lazy init BLE module to prevent permission dialog on app launch (delays state restoration)
}
```

### React Native CLI

To use lazy BLE initialization, add the following to your `Info.plist`:

```xml
<key>BLENitroLazyInit</key>
<true/>
```


### Lazy initialization
With iOS Lazy initialization, BLE will be automatically initialized on the first API call (e.g. `startScan()`, `connect()`, `state()`), which will also trigger the permission dialog. Optionally, you can call `iosLazyInit()` to explicitly initialize BLE ahead of time:

```typescript
bleNitro.iosLazyInit();
```

### iOS Background Modes

```json
{
  "modes": ["peripheral", "central"]
}
```

Adds these to `Info.plist`:
- `bluetooth-peripheral`: Act as BLE peripheral in background
- `bluetooth-central`: Scan/connect as central in background

### Android Permissions

Automatically adds required permissions and also handling neverForLocation and advertise mode.

```xml
<!-- Basic Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />

<!-- Location (required for BLE scanning) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- BLE Hardware Feature -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
```

## Android Flow with Permission Handling

```ts
import { PermissionsAndroid, Platform } from 'react-native';

const requestPermissionsAndroid = async () => {
  if (Platform.OS !== 'android') {
    return true
  }
  if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
    const apiLevel = parseInt(Platform.Version.toString(), 10);
    if (apiLevel < 31) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return (
        result === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ])

      return (
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      )
    }

    logMessage('Request permissions failed');
    throw new Error('Request permissions failed');
  }
};

const hasPermissions = await requestPermissionsAndroid();

// Then start scanning or other operations
```

## 🔧 Development

### Building the Library

```bash
# Install dependencies
npm install

# Generate native Nitro code
npx nitro-codegen

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Node not found with Android Studio on Mac

Start Android Studio from terminal to inherit correct PATH:

```sh
open -a Android\ Studio.app
```

### Project Structure

```
react-native-ble-nitro/
├── src/
│   ├── specs/              # Nitro module TypeScript specs
│   ├── utils/             # Utility functions (UUID, Base64)
│   └── errors/            # BLE error handling
├── nitrogen/generated/     # Generated native code (Nitro)
├── plugin/                # Expo config plugin
├── ios/                   # iOS native implementation (Swift)
├── android/               # Android native implementation (Kotlin)
└── docs/                  # Documentation
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**: `git clone https://github.com/YOUR_USERNAME/react-native-ble-nitro.git`
3. **Add upstream remote**: `git remote add upstream https://github.com/zykeco/react-native-ble-nitro.git`
4. **Install dependencies**: `npm install`
5. **Generate Nitro code**: `npx nitro-codegen`
6. **Make your changes** and run tests: `npm test`
7. **Submit a pull request**

## 📄 License

MIT License - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

- [Zyke Band](https://zykeband.com?utm_source=github&utm_medium=readme&utm_campaign=opensource) - The fitness tracker project that inspired this library
- [Marc Rousavy](https://github.com/mrousavy) - Creator of Nitro Modules and CEO of Margelo
- [Nitro Modules](https://nitro.margelo.com/) - High-performance native module framework
- [Margelo](https://margelo.com/) - Nitro Modules creators
- [Alvinotuya84](https://github.com/Alvinotuya84) - For the API inspiration I took from his repo [react-native-bluetooth-nitro-nexus](https://github.com/Alvinotuya84/react-native-bluetooth-nitro-nexus)

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/zykeco/react-native-ble-nitro/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/zykeco/react-native-ble-nitro/discussions)
- 📖 **Documentation**: [API Reference](./docs/api.md)

---

**Made with ❤️ for the React Native community**