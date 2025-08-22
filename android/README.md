# Android Implementation - BLE Nitro

This directory contains the Android implementation of the BLE Nitro module using Kotlin and the Android Bluetooth LE APIs.

## Architecture

### Core Components

- **NativeBleNitro.kt**: Main implementation class that extends `HybridNativeBleNitroSpec`
- **BleNitroPackage.kt**: Nitro module registration helper
- **BleNitroReactPackage.kt**: React Native package for easy integration

### Key Features

- **BLE Scanning**: Low latency scanning with service UUID filtering
- **Connection Management**: Robust GATT connection handling with callbacks
- **Service Discovery**: Automatic service and characteristic discovery
- **Data Operations**: Read/write/notify operations on characteristics
- **Permission Handling**: Android 12+ runtime permission support
- **State Management**: Bluetooth adapter state monitoring

### Android API Usage

- **BluetoothLeScanner**: For device scanning
- **BluetoothGatt**: For GATT operations
- **BluetoothGattCallback**: For connection and operation callbacks
- **ScanCallback**: For scan result handling

### Permissions

The implementation automatically handles the required permissions:

#### Android 12+ (API 31+)
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT` 
- `BLUETOOTH_ADVERTISE`

#### Pre-Android 12
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `ACCESS_FINE_LOCATION`

### Integration

1. Add the React Native package:
```kotlin
import com.margelo.nitro.co.zyke.ble.BleNitroReactPackage

// In MainApplication.java
@Override
protected List<ReactPackage> getPackages() {
    return Arrays.asList(
        // ... other packages
        new BleNitroReactPackage()
    );
}
```

2. The Nitro autolinking will handle native module registration automatically.

### Data Conversion

- **UUIDs**: Automatic conversion between 16/32-bit and 128-bit UUIDs
- **Byte Arrays**: Converted to/from JavaScript number arrays
- **Bluetooth States**: Mapped to enum values compatible with iOS

### Threading

All Bluetooth operations are handled on the main thread as required by Android Bluetooth APIs. Callbacks are invoked asynchronously to avoid blocking the UI.

### Error Handling

- Comprehensive error checking for all Bluetooth operations
- Graceful handling of permission denials
- Automatic cleanup of resources on errors
- Detailed error messages for debugging

### Testing

The implementation is tested through the shared JavaScript test suite, ensuring compatibility with the TypeScript API contract.