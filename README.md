# React Native BLE Nitro

High-performance React Native Bluetooth Low Energy library built on Nitro Modules.

## 📦 Packages

This is a monorepo containing multiple packages:

### [`react-native-ble-nitro`](./packages/react-native-ble-nitro)

Core BLE functionality for React Native applications.

**Features:**
- 🚀 Built on Nitro Modules (JSI) for maximum performance
- 📱 iOS and Android support
- 🔍 Device scanning with filters
- 🔗 Connection management
- 📡 GATT operations (read, write, notify)
- 🎯 TypeScript support
- 📦 Expo compatible

**Installation:**
```bash
npm install react-native-ble-nitro
```

**Quick Start:**
```typescript
import { BleNitro } from 'react-native-ble-nitro';

const ble = BleNitro.instance();

// Start scanning
ble.startScan({}, (device) => {
  console.log('Found device:', device.name);
});

// Connect to a device
await ble.connect(deviceId);

// Read a characteristic
const data = await ble.readCharacteristic(deviceId, serviceId, characteristicId);
```

[View full documentation →](./packages/react-native-ble-nitro)

---

### [`react-native-ble-nitro-dfu`](./packages/react-native-ble-nitro-dfu)

Nordic DFU (Device Firmware Update) extension for firmware updates over BLE.

**Features:**
- 📥 Firmware updates via Nordic DFU protocol
- 📊 Progress tracking
- ⏸️ Pause/Resume/Abort support
- 🛡️ Comprehensive error handling
- 📦 Separate package (opt-in)

**Installation:**
```bash
npm install react-native-ble-nitro react-native-ble-nitro-dfu
```

**Quick Start:**
```typescript
import { DfuNitro, DfuFirmwareType } from 'react-native-ble-nitro-dfu';

const dfu = DfuNitro.instance();

await dfu.startDfu(
  deviceId,
  'file:///path/to/firmware.zip',
  DfuFirmwareType.Application,
  {
    onProgress: (deviceId, progress) => {
      console.log(`${progress.percent}%`);
    },
    onCompleted: (deviceId, success) => {
      console.log(success ? 'Success!' : 'Failed');
    },
  }
);
```

[View full documentation →](./packages/react-native-ble-nitro-dfu)

---

## 🏗️ Monorepo Structure

```
react-native-ble-nitro/
├── packages/
│   ├── react-native-ble-nitro/          # Core BLE library
│   │   ├── src/                         # TypeScript source
│   │   ├── ios/                         # iOS native code
│   │   ├── android/                     # Android native code
│   │   └── package.json
│   └── react-native-ble-nitro-dfu/      # DFU extension
│       ├── src/                         # TypeScript source
│       └── package.json
├── example/                             # Example app
└── package.json                         # Workspace root
```

## 🛠️ Development

### Prerequisites
- Node.js >= 16
- React Native >= 0.76.0
- For iOS: Xcode, CocoaPods
- For Android: Android Studio, JDK 17+

### Setup

```bash
# Clone the repository
git clone https://github.com/zykeco/react-native-ble-nitro.git
cd react-native-ble-nitro

# Install dependencies
npm install

# Build all packages
npm run build

# Run type checking
npm run typecheck
```

### Working with Packages

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w react-native-ble-nitro

# Run tests
npm run test

# Clean build artifacts
npm run clean
```

### Running the Example

```bash
cd example

# iOS
npx pod-install
npm run ios

# Android
npm run android
```

## 📚 Documentation

- [Core BLE API Documentation](./packages/react-native-ble-nitro/README.md)
- [DFU API Documentation](./packages/react-native-ble-nitro-dfu/README.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Release Process](./RELEASE.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📄 License

MIT © [Zyke](https://zyke.co)

## 🔗 Links

- [GitHub Repository](https://github.com/zykeco/react-native-ble-nitro)
- [Issue Tracker](https://github.com/zykeco/react-native-ble-nitro/issues)
- [npm - react-native-ble-nitro](https://www.npmjs.com/package/react-native-ble-nitro)
- [npm - react-native-ble-nitro-dfu](https://www.npmjs.com/package/react-native-ble-nitro-dfu)

## 💡 Why Monorepo?

The codebase is organized as a monorepo to:

- **Reduce bundle size**: Users only install what they need
- **Independent versioning**: Core and DFU can be released separately
- **Clear separation**: Distinct packages for distinct functionality
- **Unified development**: Share tooling and development workflow
- **Optional features**: DFU is opt-in for Nordic device users

## 🙏 Acknowledgments

- Built with [Nitro Modules](https://github.com/margelo/nitro)
- Nordic DFU based on [Nordic DFU Libraries](https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-SDK)
