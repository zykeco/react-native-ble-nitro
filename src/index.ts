import BleNitroNative from './specs/NativeBleNitro';
import type {
  ScanFilter as NativeScanFilter,
  BLEDevice as NativeBLEDevice,
  BLEState,
} from './specs/NativeBleNitro';

export interface ScanFilter {
  serviceUUIDs?: string[];
  rssiThreshold?: number;
  allowDuplicates?: boolean;
}

export interface ManufacturerDataEntry {
  id: string;
  data: number[];
}

export interface ManufacturerData {
  companyIdentifiers: ManufacturerDataEntry[];
}

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData: ManufacturerData;
  serviceUUIDs: string[];
  isConnectable: boolean;
}

export type ScanCallback = (device: BLEDevice) => void;
export type ConnectionCallback = (
  success: boolean,
  deviceId: string,
  error: string
) => void;
export type OperationCallback = (success: boolean, error: string) => void;
export type CharacteristicUpdateCallback = (
  characteristicId: string,
  data: number[]
) => void;

export type { BLEState };

/**
 * Utility function to convert a key-value map to the codegen-compatible format
 */
export function mapToManufacturerData(
  map: Record<string, number[]>
): ManufacturerData {
  const result: ManufacturerData = {
    companyIdentifiers: [],
  };

  for (const [key, value] of Object.entries(map)) {
    result.companyIdentifiers.push({
      id: key,
      data: value,
    });
  }

  return result;
}

/**
 * Utility function to convert from codegen-compatible format to a key-value map
 */
export function manufacturerDataToMap(
  data: ManufacturerData
): Record<string, number[]> {
  const result: Record<string, number[]> = {};

  for (const entry of data.companyIdentifiers) {
    result[entry.id] = entry.data;
  }

  return result;
}

let _instance: BleNitro;

/**
 * Bluetooth Nexus Core class
 * Singleton implementation for React Native
 */
class BleNitro {
  private _isScanning: boolean = false;
  private _connectedDevices: { [deviceId: string]: boolean } = {};

  public static instance(): BleNitro {
    if (!_instance) {
      _instance = new BleNitro();
    }
    return _instance;
  }

  /**
   * Start scanning for Bluetooth devices
   * @param filter Optional scan filter
   * @param callback Callback function called when a device is found
   * @returns Promise resolving to success state
   */
  public startScan(
    filter: ScanFilter = {},
    callback: ScanCallback
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Don't start scanning if already scanning
      if (this._isScanning) {
        resolve(true);
        return;
      }

      // Create native scan filter with defaults
      const nativeFilter: NativeScanFilter = {
        serviceUUIDs: filter.serviceUUIDs || [],
        rssiThreshold: filter.rssiThreshold ?? -100,
        allowDuplicates: filter.allowDuplicates ?? false,
      };

      // Create callback wrapper
      const scanCallback = (device: NativeBLEDevice) => {
        callback(device);
      };

      // Start scan
      BleNitroNative.startScan(nativeFilter, scanCallback);
      this._isScanning = true;
      resolve(true);
    });
  }

  /**
   * Stop scanning for Bluetooth devices
   * @returns Promise resolving to success state
   */
  public stopScan(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Don't stop scanning if not scanning
      if (!this._isScanning) {
        resolve(true);
        return;
      }

      BleNitroNative.stopScan((success: boolean, error: string) => {
        if (success) {
          this._isScanning = false;
          resolve(true);
        } else {
          reject(new Error(error));
        }
      });
    });
  }

  /**
   * Check if currently scanning for devices
   * @returns Promise resolving to scanning state
   */
  public isScanning(): Promise<boolean> {
    return new Promise((resolve) => {
      BleNitroNative.isScanning((scanning: boolean) => {
        this._isScanning = scanning;
        resolve(scanning);
      });
    });
  }

  /**
   * Connect to a Bluetooth device
   * @param deviceId ID of the device to connect to
   * @returns Promise resolving when connected
   */
  public connect(deviceId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if already connected
      if (this._connectedDevices[deviceId]) {
        resolve(deviceId);
        return;
      }

      BleNitroNative.connect(
        deviceId,
        (success: boolean, connectedDeviceId: string, error: string) => {
          if (success) {
            this._connectedDevices[deviceId] = true;
            resolve(connectedDeviceId);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Disconnect from a Bluetooth device
   * @param deviceId ID of the device to disconnect from
   * @returns Promise resolving when disconnected
   */
  public disconnect(deviceId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if already disconnected
      if (!this._connectedDevices[deviceId]) {
        resolve(true);
        return;
      }

      BleNitroNative.disconnect(
        deviceId,
        (success: boolean, error: string) => {
          if (success) {
            delete this._connectedDevices[deviceId];
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Check if connected to a device
   * @param deviceId ID of the device to check
   * @returns Promise resolving to connection state
   */
  public isConnected(deviceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      BleNitroNative.isConnected(deviceId, (connected: boolean) => {
        this._connectedDevices[deviceId] = connected;
        resolve(connected);
      });
    });
  }

  /**
   * Discover services for a connected device
   * @param deviceId ID of the device
   * @returns Promise resolving when services are discovered
   */
  public discoverServices(deviceId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.discoverServices(
        deviceId,
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Get services for a connected device
   * @param deviceId ID of the device
   * @returns Promise resolving to array of service UUIDs
   */
  public getServices(deviceId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.getServices(deviceId, (services: string[]) => {
        resolve(services);
      });
    });
  }

  /**
   * Get characteristics for a service
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @returns Promise resolving to array of characteristic UUIDs
   */
  public getCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.getCharacteristics(
        deviceId,
        serviceId,
        (characteristics: string[]) => {
          resolve(characteristics);
        }
      );
    });
  }

  /**
   * Read a characteristic value
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @returns Promise resolving when read is complete
   */
  public readCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.readCharacteristic(
        deviceId,
        serviceId,
        characteristicId,
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Write a value to a characteristic
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @param data Data to write as an array of bytes
   * @param withResponse Whether to wait for response
   * @returns Promise resolving when write is complete
   */
  public writeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    data: number[],
    withResponse: boolean = true
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.writeCharacteristic(
        deviceId,
        serviceId,
        characteristicId,
        data,
        withResponse,
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Subscribe to characteristic notifications
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @param callback Callback function called when notification is received
   * @returns Promise resolving when subscription is complete
   */
  public subscribeToCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    callback: CharacteristicUpdateCallback
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.subscribeToCharacteristic(
        deviceId,
        serviceId,
        characteristicId,
        (charId: string, data: number[]) => {
          callback(charId, data);
        },
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Unsubscribe from characteristic notifications
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @returns Promise resolving when unsubscription is complete
   */
  public unsubscribeFromCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.unsubscribeFromCharacteristic(
        deviceId,
        serviceId,
        characteristicId,
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Check if Bluetooth is enabled
   * @returns Promise resolving to Bluetooth state
   */
  public isBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      BleNitroNative.isBluetoothEnabled((enabled: boolean) => {
        resolve(enabled);
      });
    });
  }

  /**
   * Request to enable Bluetooth
   * @returns Promise resolving when Bluetooth is enabled
   */
  public requestBluetoothEnable(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleNitroNative.requestBluetoothEnable(
        (success: boolean, error: string) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(error));
          }
        }
      );
    });
  }

  /**
   * Get the current Bluetooth state
   * @returns Promise resolving to Bluetooth state
   * @see BLEState
   */
  public state(): Promise<BLEState> {
    return new Promise((resolve) => {
      BleNitroNative.state((state: BLEState) => {
        resolve(state);
      });
    });
  }

  /**
   * Subscribe to Bluetooth state changes
   * @param callback Callback function called when state changes
   * @returns Promise resolving when subscription is complete
   * @see BLEState
   */
  public subscribeToStateChange(callback: (state: BLEState) => void): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleNitroNative.subscribeToStateChange((state: BLEState) => {
        callback(state);
      }, (success: boolean, error: string) => {
        if (success) {
          resolve(true);
        } else {
          reject(new Error(error));
        }
      });
    })
  }
}

// Export the singleton instance
export default BleNitro.instance();
