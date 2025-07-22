# react-native-ble-nitro

[![npm version](https://badge.fury.io/js/react-native-ble-nitro.svg)](https://badge.fury.io/js/react-native-ble-nitro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance React Native BLE library built on [Nitro Modules](https://nitro.margelo.com/) - **drop-in replacement** for `react-native-ble-plx` with significantly better performance and stability.

Originally developed for [Zyke Band](https://zykeband.com) - a fitness and health tracker created by a small team.

## ✨ Features

- 🚀 **High Performance**: Built on Nitro Modules with JSI for zero-overhead native communication
- 🔄 **100% Compatible**: Drop-in replacement for `react-native-ble-plx@3.5.0`
- 📱 **Cross-Platform**: iOS and Android support with platform-specific optimizations
- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🔧 **Expo Ready**: Built-in Expo config plugin for easy setup
- 🏗️ **New Architecture**: Full support for React Native's new architecture
- ⚡ **Zero Bridge**: Direct JSI communication eliminates bridge bottlenecks
- 🛡️ **Reliable**: Swift/Kotlin native implementations for maximum stability

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

The API is 100% identical to `react-native-ble-plx`:

```typescript
import { BleManager, State } from 'react-native-ble-nitro';

const manager = new BleManager();

// Check Bluetooth state
const state = await manager.state();
if (state === State.PoweredOn) {
  console.log('Bluetooth is ready!');
}

// Scan for devices
manager.startDeviceScan(null, null, (error, device) => {
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Found device:', device.name || 'Unknown');
  
  if (device.name === 'MyDevice') {
    manager.stopDeviceScan();
    
    // Connect to device
    device.connect()
      .then(() => device.discoverAllServicesAndCharacteristics())
      .then(() => {
        // Your BLE operations here
        console.log('Connected and ready!');
      })
      .catch(console.error);
  }
});
```

## 🔄 Migration from react-native-ble-plx

**Zero code changes required!** Simply replace the import:

```typescript
// Before
import { BleManager, Device, State } from 'react-native-ble-plx';

// After
import { BleManager, Device, State } from 'react-native-ble-nitro';

// Everything else stays exactly the same!
```

## 🏗️ Architecture

### Nitro Modules Foundation

Built on [Nitro Modules](https://nitro.margelo.com/) for:

- **Direct JSI Communication**: No React Native bridge overhead
- **Type-Safe Bindings**: Compile-time type checking across JS/Native boundary  
- **High Performance**: Near-native performance for all operations
- **Memory Efficient**: Optimal memory management with smart references

### Platform Implementation

- **iOS**: Native Swift implementation using Core Bluetooth
- **Android**: Native Kotlin implementation using Android BLE APIs
- **Shared C++**: Common logic and type definitions

### Compatibility Layer

While maintaining 100% API compatibility, some internal changes were needed for Nitro:

- **Enum Values**: Numeric instead of string (transparent to users)
- **Service Data**: Structured format internally (automatic conversion)
- **Type Safety**: Enhanced compile-time checks

See [API_DIFFERENCES.md](./API_DIFFERENCES.md) for technical details.

## 📋 API Reference

The API is identical to `react-native-ble-plx`. Key classes and methods:

### BleManager

- `new BleManager(options?)`: Create manager instance
- `state()`: Get current Bluetooth state
- `startDeviceScan()`: Start scanning for devices
- `connectToDevice()`: Connect to a BLE device
- `readCharacteristicForDevice()`: Read characteristic value
- `writeCharacteristicWithResponseForDevice()`: Write with response
- `monitorCharacteristicForDevice()`: Monitor value changes

### Device

- `connect()`: Connect to this device
- `discoverAllServicesAndCharacteristics()`: Discover GATT structure
- `readCharacteristicForService()`: Read characteristic
- `monitorCharacteristicForService()`: Monitor characteristic

For complete API documentation, see the [react-native-ble-plx docs](https://github.com/dotintent/react-native-ble-plx) - everything applies to this library too!

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
│   ├── compatibility/      # react-native-ble-plx compatibility layer
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

## Comparison with react-native-ble-plx

| Feature | react-native-ble-plx | react-native-ble-nitro |
|---------|---------------------|------------------------|
| **Performance** | React Native Bridge | Direct JSI ⚡ |
| **Type Safety** | TypeScript definitions | Compile-time validation ✅ |
| **Memory Usage** | Higher overhead | Optimized 🎯 |
| **New Architecture** | Limited support | Full support ✅ |
| **API Compatibility** | Original | 100% Compatible ✅ |

## 🙏 Acknowledgments

- [Zyke Band](https://zykeband.com) - The fitness tracker project that inspired this library
- [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) - Original library and API design
- [Marc Rousavy](https://github.com/mrousavy) - Creator of Nitro Modules and CEO of Margelo
- [Nitro Modules](https://nitro.margelo.com/) - High-performance native module framework
- [Margelo](https://margelo.com/) - Nitro Modules creators

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/zykeco/react-native-ble-nitro/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/zykeco/react-native-ble-nitro/discussions)
- 📖 **Documentation**: [API Reference](./docs/api.md)

---

**Made with ❤️ for the React Native community**