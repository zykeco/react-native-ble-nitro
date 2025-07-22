# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `react-native-ble-nitro`, a high-performance 100% drop-in replacement for `react-native-ble-plx@3.5.0` built on Nitro Modules framework. The library targets React Native ≥ 0.76.x with Expo SDK ≥ 52 and uses Swift/Kotlin for native implementations.

## Complete Implementation Plan

### Phase 1: Project Structure & Build System
```
react-native-ble-nitro/
├── src/
│   ├── specs/                    # Nitro Module TypeScript specs
│   │   ├── BleManager.nitro.ts   # Main BLE manager spec
│   │   ├── Device.nitro.ts       # Device hybrid object spec
│   │   └── types.ts              # Type definitions
│   ├── index.ts                  # Main export file
│   └── utils/                    # Utility functions
├── ios/                          # Swift native implementation
│   ├── HybridBleManager.swift
│   ├── HybridDevice.swift
│   └── BLE/                      # Core BLE logic
├── android/                      # Kotlin native implementation
│   ├── HybridBleManager.kt
│   ├── HybridDevice.kt
│   └── ble/                      # Core BLE logic
├── plugin/                       # Expo config plugin
│   ├── src/
│   │   ├── index.ts
│   │   └── withBleNitro.ts
│   └── build/
├── nitro.json                    # Nitro configuration
├── package.json
├── tsconfig.json
└── react-native.config.js
```

### Phase 2: Nitro Module Architecture

#### Core Hybrid Objects:
1. **HybridBleManager**: Main entry point matching BleManager API
2. **HybridDevice**: Device representation with connection management
3. **HybridService**: Service object for GATT operations
4. **HybridCharacteristic**: Characteristic operations
5. **HybridDescriptor**: Descriptor operations

#### TypeScript Specs (Nitro Interface Definitions):
```typescript
interface BleManager extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  // State management
  state(): Promise<State>
  onStateChange(listener: StateListener, emitCurrentState?: boolean): Subscription
  
  // Device scanning
  startDeviceScan(uuids: UUID[] | null, options: ScanOptions | null, listener: DeviceScanListener): Promise<void>
  stopDeviceScan(): Promise<void>
  
  // Connection management
  connectToDevice(deviceId: DeviceId, options?: ConnectionOptions): Promise<HybridDevice>
  cancelDeviceConnection(deviceId: DeviceId): Promise<HybridDevice>
  isDeviceConnected(deviceId: DeviceId): Promise<boolean>
  
  // GATT operations
  discoverAllServicesAndCharacteristicsForDevice(deviceId: DeviceId, transactionId?: TransactionId): Promise<HybridDevice>
  readCharacteristicForDevice(deviceId: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, transactionId?: TransactionId): Promise<HybridCharacteristic>
  // ... all other BLE operations
}
```

### Phase 3: Native Implementation Strategy

#### iOS (Swift) Implementation:
- Use Core Bluetooth framework
- CBCentralManager for scanning and connection management
- CBPeripheral for device operations
- Implement all BLE operations with proper error handling
- Background mode support for continuous scanning/connection

#### Android (Kotlin) Implementation:
- Use BluetoothAdapter and BluetoothGatt APIs
- Implement different scan modes (low power, balanced, low latency)
- Handle Android permissions (location, bluetooth)
- Support Android 14+ changes for MTU management

### Phase 4: API Compatibility Layer

#### Complete API Surface Coverage:
1. **BleManager Methods** (50+ methods):
   - State management (enable, disable, state, onStateChange)
   - Device scanning (startDeviceScan, stopDeviceScan)
   - Connection management (connectToDevice, cancelDeviceConnection, etc.)
   - Service/Characteristic discovery and operations
   - RSSI reading, MTU requests, connection priority

2. **Device Methods** (30+ methods):
   - All BleManager methods with pre-filled device ID
   - Connection state management
   - Service and characteristic operations

3. **Service/Characteristic/Descriptor Operations**:
   - Read/Write operations with Base64 encoding
   - Monitoring (notifications/indications)
   - Descriptor operations

4. **Error Handling**:
   - Complete BleErrorCode enum implementation
   - Platform-specific error code mapping (iOS/Android/ATT)
   - Error message localization support

### Phase 5: Expo Plugin Implementation

#### Plugin Features:
- iOS Info.plist configuration (NSBluetoothAlwaysUsageDescription)
- Android manifest permissions and features
- Background mode configuration
- Location permission handling for Android
- Support for all configuration options from react-native-ble-plx

```typescript
// Plugin configuration interface
interface BleNitroPluginProps {
  isBackgroundEnabled?: boolean;
  neverForLocation?: boolean;
  modes?: ('peripheral' | 'central')[];
  bluetoothAlwaysPermission?: string | false;
}
```

### Phase 6: Build System & Dependencies

#### Package.json Configuration:
```json
{
  "name": "react-native-ble-nitro",
  "version": "1.0.0",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "react-native": "src/index.ts",
  "dependencies": {
    "react-native-nitro-modules": "^0.16.0"
  },
  "peerDependencies": {
    "react-native": ">=0.76.0"
  }
}
```

#### Build Configuration:
- TypeScript compilation setup
- Native code autolinking configuration
- Nitro codegen integration
- Expo plugin build process

### Phase 7: Testing Strategy

#### Unit Tests:
- TypeScript API surface testing
- Mock native implementations
- Error handling scenarios
- Expo Config Plugin Behavior

#### Integration Tests:
- Real device BLE operations
- Connection lifecycle testing
- GATT operations validation

#### Compatibility Tests:
- Side-by-side comparison with react-native-ble-plx
- API compatibility validation
- Performance benchmarking

## Development Commands

```bash
# Install dependencies
npm install

# Generate native code with Nitro
npx nitro-codegen generate

# Build TypeScript
npm run build

# Run tests
npm test

# Build Expo plugin
npm run build:plugin

# Development with Expo
npx expo prebuild
npx expo run:android
npx expo run:ios
```

## Implementation Priority

1. **Core Architecture** - Nitro module setup and basic structure
2. **BleManager Implementation** - State management and device scanning
3. **Device Operations** - Connection management and basic GATT operations
4. **Complete API Surface** - All read/write/monitor operations
5. **Error Handling** - Complete error code implementation
6. **Expo Plugin** - Configuration and permission management
7. **Testing & Validation** - Comprehensive test suite
8. **Performance Optimization** - Fine-tuning for production use
9. **Contributor Documentation** - Clear guidelines for future contributors

## Key Implementation Notes

- Maintain 100% API compatibility with react-native-ble-plx@3.5.0
- Use existing TypeScript definitions from `react-native-ble-plx-typescript-api.ts`
- Leverage Nitro's type-safety and performance benefits
- Ensure proper memory management in native implementations
- Support both Expo managed workflow and bare React Native projects
- Implement comprehensive error handling with platform-specific error codes
- Support all BLE features: scanning, connecting, GATT operations, notifications, background mode
- Keep maintainability in mind with clear separation of concerns