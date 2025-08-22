# Android Scan Modes

The BLE Nitro library supports Android-specific scan modes for optimizing battery usage and scan performance. These modes are only used on Android and are ignored on iOS.

## Available Scan Modes

### `AndroidScanMode.LowPower` (0)
- **Battery Impact**: Lowest battery usage
- **Scan Frequency**: Reduced scan frequency
- **Use Case**: Background scanning, apps that don't need immediate device discovery
- **Trade-off**: Slower device discovery but better battery life

### `AndroidScanMode.Balanced` (1) 
- **Battery Impact**: Moderate battery usage
- **Scan Frequency**: Balanced scan frequency
- **Use Case**: General purpose scanning for most applications
- **Trade-off**: Good balance between discovery speed and battery usage

### `AndroidScanMode.LowLatency` (2) - Default
- **Battery Impact**: Highest battery usage
- **Scan Frequency**: High scan frequency
- **Use Case**: Apps requiring immediate device discovery
- **Trade-off**: Fastest discovery but higher battery drain

### `AndroidScanMode.Opportunistic` (-1)
- **Battery Impact**: Very low (passive scanning)
- **Scan Frequency**: Only when other apps are scanning
- **Use Case**: Passive monitoring applications
- **Trade-off**: Unpredictable scan timing, depends on other apps

## Usage Examples

```typescript
import { ble, AndroidScanMode } from 'react-native-ble-nitro';

// Default behavior (LowLatency on Android)
ble.startScan({}, (device) => {
  console.log('Found device:', device.name);
});

// Low power scanning for background apps
ble.startScan({
  androidScanMode: AndroidScanMode.LowPower
}, (device) => {
  console.log('Found device:', device.name);
});

// Balanced scanning for general use
ble.startScan({
  serviceUUIDs: ['180F'], // Battery Service
  androidScanMode: AndroidScanMode.Balanced
}, (device) => {
  console.log('Found battery device:', device.name);
});

// Opportunistic scanning for passive monitoring
ble.startScan({
  androidScanMode: AndroidScanMode.Opportunistic,
  allowDuplicates: false
}, (device) => {
  console.log('Passively found device:', device.name);
});
```

## Platform Behavior

- **Android**: Uses the specified scan mode to configure `ScanSettings.Builder().setScanMode()`
- **iOS**: Ignores the `androidScanMode` parameter completely
- **Cross-platform apps**: Can safely use `androidScanMode` without iOS compatibility issues

## Performance Guidelines

1. **Background Apps**: Use `LowPower` or `Opportunistic` modes
2. **User-initiated Scanning**: Use `LowLatency` for immediate results
3. **Continuous Monitoring**: Use `Balanced` for sustained scanning
4. **Battery-critical Apps**: Prefer `LowPower` and implement smart scanning intervals

## Implementation Details

The scan mode maps directly to Android's `ScanSettings` scan modes:

```kotlin
val androidScanMode = when (filter.androidScanMode) {
    AndroidScanMode.LOWPOWER -> ScanSettings.SCAN_MODE_LOW_POWER
    AndroidScanMode.BALANCED -> ScanSettings.SCAN_MODE_BALANCED
    AndroidScanMode.LOWLATENCY -> ScanSettings.SCAN_MODE_LOW_LATENCY
    AndroidScanMode.OPPORTUNISTIC -> ScanSettings.SCAN_MODE_OPPORTUNISTIC
    else -> ScanSettings.SCAN_MODE_LOW_LATENCY // Default fallback
}
```

This provides direct access to Android's native BLE scanning optimizations while maintaining full iOS compatibility.