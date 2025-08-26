# react-native-ble-nitro

[![npm version](https://badge.fury.io/js/react-native-ble-nitro.svg)](https://badge.fury.io/js/react-native-ble-nitro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance React Native BLE library built on [Nitro Modules](https://nitro.margelo.com/).

Originally developed for [Zyke Band](https://zykeband.com?utm_source=github&utm_medium=readme&utm_campaign=opensource) - a fitness and health tracker created by a small team.

## ✨ Features

- 🚀 **High Performance**: Built on Nitro Modules with JSI for zero-overhead native communication
- 📱 **iOS Support**: Complete iOS implementation with Swift and Core Bluetooth
- 🤖 **Android Support**: Currently in development - iOS fully functional
- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
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

> **📱 Platform Support**: Currently iOS only. Android implementation is in development.

### Basic Setup

```typescript
import { BleNitro, BLEState, type BLEDevice } from 'react-native-ble-nitro';

// Get the singleton instance
const ble = BleNitro.instance();
```

### Complete API Reference

#### 🔌 Bluetooth State Management

```typescript
// Check if Bluetooth is enabled
const isEnabled = ble.isBluetoothEnabled();

// Get current Bluetooth state
const state = ble.state();
// Returns: BLEState.PoweredOn, BLEState.PoweredOff, etc.

// Request to enable Bluetooth (Android only)
await ble.requestBluetoothEnable();

// Subscribe to state changes
const subscription = ble.subscribeToStateChange((state) => {
  console.log('Bluetooth state changed:', state);
}, true); // true = emit initial state

// Unsubscribe from state changes
subscription.remove();

// Open Bluetooth settings
await ble.openSettings();
```

#### 🔍 Device Scanning

```typescript
// Start scanning for devices
ble.startScan({
  serviceUUIDs: ['180d'], // Optional: filter by service UUIDs
  rssiThreshold: -80,     // Optional: minimum signal strength
  allowDuplicates: false  // Optional: allow duplicate discoveries
}, (device) => {
  console.log('Found device:', device.name, device.id);
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

// Disconnect from a device
await ble.disconnect(deviceId);

// Check connection status
const isConnected = ble.isConnected(deviceId);

// MTU negotiation (Android only, as iOS manages MTU automatically)
// iOS returns current MTU size
const mtu = await ble.requestMTU(deviceId, 256); // Request MTU size
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
```

#### 📖 Reading Characteristics

```typescript
// Read a characteristic value
const data = await ble.readCharacteristic(deviceId, serviceUUID, characteristicUUID);
// Returns: number[] - array of bytes

// Example: Reading battery level
const batteryData = await ble.readCharacteristic(deviceId, '180f', '2a19');
const batteryLevel = batteryData[0]; // First byte is battery percentage
console.log('Battery level:', batteryLevel + '%');
```

#### ✍️ Writing Characteristics

```typescript
// Write to a characteristic with response
await ble.writeCharacteristic(
  deviceId, 
  serviceUUID, 
  characteristicUUID, 
  [0x01, 0x02, 0x03], // Data as byte array
  true // withResponse = true (default)
);

// Write without response (faster, no confirmation)
await ble.writeCharacteristic(
  deviceId, 
  serviceUUID, 
  characteristicUUID, 
  [0x01, 0x02, 0x03],
  false // withResponse = false
);
```

#### 📡 Characteristic Notifications

```typescript
// Subscribe to characteristic notifications
const subscription = ble.subscribeToCharacteristic(
  deviceId,
  serviceUUID,
  characteristicUUID,
  (characteristicId, data) => {
    console.log('Received notification:', data);
    // Handle incoming data
  }
);

// Unsubscribe from notifications
subscription.remove();

// Or unsubscribe directly
await ble.unsubscribeFromCharacteristic(deviceId, serviceUUID, characteristicUUID);
```

### Real-World Examples

#### Heart Rate Monitor

```typescript
const HEART_RATE_SERVICE = '180d';
const HEART_RATE_MEASUREMENT = '2a37';

// Connect and subscribe to heart rate
const deviceId = await ble.connect(heartRateDeviceId);
await ble.discoverServices(deviceId);

const subscription = ble.subscribeToCharacteristic(
  deviceId,
  HEART_RATE_SERVICE,
  HEART_RATE_MEASUREMENT,
  (_, data) => {
    const heartRate = data[1]; // Second byte contains BPM
    console.log('Heart rate:', heartRate, 'BPM');
  }
);

// Unsubscribe when done
subscription.remove();
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

### TypeScript Types

```typescript
interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData: ManufacturerData;
  serviceUUIDs: string[];
  isConnectable: boolean;
}

interface ScanFilter {
  serviceUUIDs?: string[];
  rssiThreshold?: number;
  allowDuplicates?: boolean;
}

interface Subscription {
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

// Callback types
type DisconnectEventCallback = (deviceId: string, interrupted: boolean, error: string) => void;
type CharacteristicUpdateCallback = (characteristicId: string, data: number[]) => void;
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
- **Android**: 🚧 Kotlin implementation in development using Android BLE APIs  
- **Shared C++**: Common logic and type definitions via Nitro Modules

### Compatibility Layer

While maintaining 100% API compatibility, some internal changes were needed for Nitro:

- **Enum Values**: Numeric instead of string (transparent to users)
- **Service Data**: Structured format internally (automatic conversion)
- **Type Safety**: Enhanced compile-time checks

See [API_DIFFERENCES.md](./API_DIFFERENCES.md) for technical details.

## ⚙️ Configuration

### Expo Plugin Options

```typescript
interface BleNitroPluginProps {
  isBackgroundEnabled?: boolean;     // Enable background BLE support
  neverForLocation?: boolean;        // Assert no location derivation [Android 12+]
  modes?: ('peripheral' | 'central')[]; // iOS background modes
  bluetoothAlwaysPermission?: string | false; // iOS permission message
}
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

Automatically adds required permissions:

```xml
<!-- Basic Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />

<!-- Location (required for BLE scanning) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- BLE Hardware Feature -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
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