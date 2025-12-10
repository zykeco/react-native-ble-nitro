# Nordic DFU (Device Firmware Update)

This library provides TypeScript interfaces for performing firmware updates on Nordic Semiconductor devices using the Nordic DFU protocol.

## Overview

The Nordic DFU functionality allows you to:
- Update application firmware
- Update bootloader
- Update SoftDevice (Nordic's Bluetooth stack)
- Update multiple components in a single operation
- Monitor progress and handle errors
- Pause, resume, and abort updates

## Installation

The DFU functionality is included in `react-native-ble-nitro`. No additional installation is required.

**Note:** Native implementation is not yet available. This documentation covers the TypeScript interface that will be used once native implementations are added.

## Basic Usage

### Using the Singleton

```typescript
import { DfuNitro, DfuFirmwareType, DfuState } from 'react-native-ble-nitro';

const dfuManager = DfuNitro.instance();

await dfuManager.startDfu(
  deviceId,
  'file:///path/to/firmware.zip',
  DfuFirmwareType.Application,
  {
    onProgress: (deviceId, progress) => {
      console.log(`Progress: ${progress.percent}%`);
      console.log(`Speed: ${(progress.currentSpeed / 1024).toFixed(2)} KB/s`);
    },
    onStateChanged: (deviceId, state) => {
      console.log(`DFU State: ${state}`);
    },
    onError: (deviceId, error, errorType, message) => {
      console.error(`DFU Error: ${error}`, message);
    },
    onCompleted: (deviceId, success) => {
      if (success) {
        console.log('Firmware update completed successfully!');
      } else {
        console.error('Firmware update failed');
      }
    },
  }
);
```

### Using the Manager Class

```typescript
import { DfuManager, DfuFirmwareType } from 'react-native-ble-nitro';

const dfuManager = new DfuManager();

// Start DFU
await dfuManager.startDfu(
  deviceId,
  firmwareUri,
  DfuFirmwareType.Application,
  {
    onProgress: (deviceId, progress) => {
      // Update UI with progress
      setProgress(progress.percent);
    },
    onCompleted: (deviceId, success) => {
      // Handle completion
    },
  },
  {
    // Optional configuration
    packetReceiptNotificationParameter: 12,
    disableResume: false,
  }
);

// Control DFU
dfuManager.pauseDfu(deviceId);
dfuManager.resumeDfu(deviceId);
dfuManager.abortDfu(deviceId);

// Check status
const isInProgress = dfuManager.isDfuInProgress(deviceId);
const currentState = dfuManager.getDfuState(deviceId);
```

## Firmware Types

### DfuFirmwareType

```typescript
enum DfuFirmwareType {
  Softdevice = 'Softdevice',                              // SoftDevice only
  Bootloader = 'Bootloader',                              // Bootloader only
  Application = 'Application',                            // Application only
  SoftdeviceBootloader = 'SoftdeviceBootloader',          // SoftDevice + Bootloader
  SoftdeviceBootloaderApplication = 'SoftdeviceBootloaderApplication', // All three
}
```

## DFU States

```typescript
enum DfuState {
  Idle = 'Idle',                      // No DFU in progress
  Starting = 'Starting',              // DFU is starting
  Connecting = 'Connecting',          // Connecting to device
  EnablingDfuMode = 'EnablingDfuMode', // Enabling DFU mode
  Uploading = 'Uploading',            // Uploading firmware
  Validating = 'Validating',          // Validating firmware
  Disconnecting = 'Disconnecting',    // Disconnecting from device
  Completed = 'Completed',            // DFU completed successfully
  Aborted = 'Aborted',                // DFU was aborted
  Error = 'Error',                    // Error occurred
}
```

## Progress Information

The `onProgress` callback receives a `DfuProgressInfo` object:

```typescript
interface DfuProgressInfo {
  percent: number;        // Progress percentage (0-100)
  currentPart: number;    // Current part being uploaded
  totalParts: number;     // Total parts to upload
  avgSpeed: number;       // Average upload speed in bytes/second
  currentSpeed: number;   // Current upload speed in bytes/second
}
```

## Error Handling

### Error Types

```typescript
enum DfuError {
  None = 'None',
  FileNotSpecified = 'FileNotSpecified',
  FileInvalid = 'FileInvalid',
  RemoteLegacyDFUInvalidState = 'RemoteLegacyDFUInvalidState',
  RemoteLegacyDFUOperationFailed = 'RemoteLegacyDFUOperationFailed',
  RemoteSecureDFUInvalidObject = 'RemoteSecureDFUInvalidObject',
  RemoteSecureDFUSignatureMismatch = 'RemoteSecureDFUSignatureMismatch',
  DeviceDisconnected = 'DeviceDisconnected',
  BluetoothDisabled = 'BluetoothDisabled',
  ServiceDiscoveryFailed = 'ServiceDiscoveryFailed',
  DeviceNotSupported = 'DeviceNotSupported',
  // ... and more (see DfuError enum)
}
```

### Error Callback

```typescript
onError: (deviceId: string, error: DfuError, errorType: number, message: string) => {
  console.error(`Error ${error} (${errorType}): ${message}`);

  // Handle specific errors
  switch (error) {
    case DfuError.DeviceDisconnected:
      // Handle disconnection
      break;
    case DfuError.FileInvalid:
      // Handle invalid file
      break;
    default:
      // Handle other errors
  }
}
```

## Configuration Options

```typescript
interface DfuServiceInitiatorOptions {
  /**
   * Number of packets before sending Packet Receipt Notification
   * Default: 12
   * Set to 0 to disable (not recommended on iOS)
   */
  packetReceiptNotificationParameter?: number;

  /**
   * Force scanning for new device address after bootloader mode (Legacy DFU only)
   * Default: false
   */
  forceScanningForNewAddressInLegacyDfu?: boolean;

  /**
   * Disable resume capability (always start from beginning)
   * Default: false
   */
  disableResume?: boolean;
}
```

## Complete Example

```typescript
import React, { useState } from 'react';
import { View, Button, Text, ProgressBar } from 'react-native';
import { BleNitro, DfuNitro, DfuFirmwareType, DfuState } from 'react-native-ble-nitro';

function FirmwareUpdateScreen({ deviceId }) {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<DfuState>(DfuState.Idle);
  const [error, setError] = useState<string | null>(null);

  const startUpdate = async () => {
    try {
      const dfuManager = DfuNitro.instance();

      await dfuManager.startDfu(
        deviceId,
        'file:///path/to/firmware.zip',
        DfuFirmwareType.Application,
        {
          onProgress: (deviceId, progressInfo) => {
            setProgress(progressInfo.percent);
            console.log(
              `Part ${progressInfo.currentPart}/${progressInfo.totalParts} - ` +
              `${(progressInfo.currentSpeed / 1024).toFixed(2)} KB/s`
            );
          },
          onStateChanged: (deviceId, newState) => {
            setState(newState);
          },
          onError: (deviceId, error, errorType, message) => {
            setError(`${error}: ${message}`);
          },
          onCompleted: (deviceId, success) => {
            if (success) {
              console.log('Firmware updated successfully!');
              // Reconnect to device if needed
            } else {
              console.error('Firmware update failed');
            }
          },
        },
        {
          packetReceiptNotificationParameter: 12,
          disableResume: false,
        }
      );
    } catch (err) {
      setError(`Failed to start DFU: ${err.message}`);
    }
  };

  const pauseUpdate = () => {
    const dfuManager = DfuNitro.instance();
    dfuManager.pauseDfu(deviceId);
  };

  const resumeUpdate = () => {
    const dfuManager = DfuNitro.instance();
    dfuManager.resumeDfu(deviceId);
  };

  const abortUpdate = () => {
    const dfuManager = DfuNitro.instance();
    dfuManager.abortDfu(deviceId);
  };

  return (
    <View>
      <Text>DFU State: {state}</Text>
      <ProgressBar progress={progress / 100} />
      <Text>{progress}%</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <Button title="Start Update" onPress={startUpdate} />
      <Button title="Pause" onPress={pauseUpdate} />
      <Button title="Resume" onPress={resumeUpdate} />
      <Button title="Abort" onPress={abortUpdate} />
    </View>
  );
}
```

## Firmware File Format

### iOS
- Requires a **ZIP file** containing:
  - Firmware binary file(s)
  - `manifest.json` describing the update

Example `manifest.json`:
```json
{
  "manifest": {
    "application": {
      "bin_file": "application.bin",
      "dat_file": "application.dat"
    }
  }
}
```

### Android
- Supports **ZIP**, **BIN**, or **HEX** files
- ZIP format same as iOS
- BIN/HEX files can be used directly for simple updates

## Best Practices

1. **Check device connection** before starting DFU
   ```typescript
   const bleManager = BleNitro.instance();
   if (!bleManager.isConnected(deviceId)) {
     await bleManager.connect(deviceId);
   }
   ```

2. **Disconnect after completion** if needed
   ```typescript
   onCompleted: async (deviceId, success) => {
     if (success) {
       // Wait a moment for device to restart
       await new Promise(resolve => setTimeout(resolve, 2000));
       // Reconnect if needed
       await bleManager.connect(deviceId);
     }
   }
   ```

3. **Handle interruptions**
   - Device might disconnect during update
   - App might go to background
   - Use `disableResume: false` to allow resuming after interruptions

4. **Provide user feedback**
   - Show progress percentage
   - Display current state
   - Show upload speed
   - Allow user to abort if needed

5. **Test thoroughly**
   - Test with various firmware sizes
   - Test interruptions (background app, disconnect)
   - Test error scenarios
   - Test on both iOS and Android

## Limitations

- Device must be connected via BLE before starting DFU
- Only one DFU can be active per device at a time
- Large firmware files may take several minutes to upload
- Native implementation is not yet available (TypeScript interface only)

## Troubleshooting

### "Device not connected" error
Make sure the device is connected before calling `startDfu()`.

### "DFU already in progress" error
Another DFU is already running for this device. Wait for it to complete or abort it first.

### File format errors
Ensure your firmware file matches the required format for the platform:
- iOS: ZIP with manifest.json
- Android: ZIP, BIN, or HEX

### Slow upload speed
Try adjusting `packetReceiptNotificationParameter`:
- Higher values = faster but less reliable
- Lower values = slower but more reliable
- Default: 12

## Related

- [Nordic DFU Library (iOS)](https://github.com/NordicSemiconductor/IOS-DFU-Library)
- [Nordic DFU Library (Android)](https://github.com/NordicSemiconductor/Android-DFU-Library)
- [Nordic DFU Protocol Documentation](https://infocenter.nordicsemi.com/topic/sdk_nrf5_v17.1.0/lib_bootloader_dfu_process.html)
