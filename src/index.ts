import BleNitroNative from './specs/NativeBleNitro';
import {
  ScanFilter as NativeScanFilter,
  BLEDevice as NativeBLEDevice,
  BLEState as NativeBLEState,
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
export type DisconnectEventCallback = (
  deviceId: string,
  interrupted: boolean,
  error: string
) => void;
export type OperationCallback = (success: boolean, error: string) => void;
export type CharacteristicUpdateCallback = (
  characteristicId: string,
  data: number[]
) => void;

export type Subscription = {
  remove: () => Promise<void>;
};

export enum BLEState {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn',
};

function mapNativeBLEStateToBLEState(nativeState: NativeBLEState): BLEState {
  const map = {
    0: BLEState.Unknown,
    1: BLEState.Resetting,
    2: BLEState.Unsupported,
    3: BLEState.Unauthorized,
    4: BLEState.PoweredOff,
    5: BLEState.PoweredOn,
  };
  return map[nativeState];
}

let _instance: BleNitro;

export class BleNitro {
  private _isScanning: boolean = false;
  private _connectedDevices: { [deviceId: string]: boolean } = {};

  public static instance(): BleNitro {
    if (!_instance) {
      _instance = new BleNitro();
    }
    return _instance;
  }

  /**
   * Converts a 16- oder 32-Bit UUID to a 128-Bit UUID
   *
   * @param uuid 16-, 32- or 128-Bit UUID as string
   * @returns Full 128-Bit UUID
   */
  public static normalizeGattUUID(uuid: string): string {
    const cleanUuid = uuid.toLowerCase();

    // 128-Bit UUID → normalisieren
    if (cleanUuid.length === 36 && cleanUuid.includes("-")) {
      return cleanUuid;
    }

    // GATT-Service UUIDs
    // 16- oder 32-Bit UUID → 128-Bit UUID
    const padded = cleanUuid.padStart(8, "0");
    return `${padded}-0000-1000-8000-00805f9b34fb`;
  }

  public static normalizeGattUUIDs(uuids: string[]): string[] {
    return uuids.map((uuid) => BleNitro.normalizeGattUUID(uuid));
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
        device.serviceUUIDs = BleNitro.normalizeGattUUIDs(device.serviceUUIDs);
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
   * Get all currently connected devices
   * @returns Promise resolving to array of connected devices
   */
  public getConnectedDevices(): Promise<BLEDevice[]> {
    return new Promise((resolve) => {
      BleNitroNative.getConnectedDevices((devices: BLEDevice[]) => {
        // Normalize service UUIDs for connected devices
        const normalizedDevices = devices.map(device => ({
          ...device,
          serviceUUIDs: BleNitro.normalizeGattUUIDs(device.serviceUUIDs)
        }));
        resolve(normalizedDevices);
      });
    });
  }

  /**
   * Connect to a Bluetooth device
   * @param deviceId ID of the device to connect to
   * @param onDisconnect Optional callback for disconnect events
   * @returns Promise resolving when connected
   */
  public connect(
    deviceId: string, 
    onDisconnect?: DisconnectEventCallback
  ): Promise<string> {
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
        },
        onDisconnect ? (deviceId: string, interrupted: boolean, error: string) => {
          // Remove from connected devices when disconnected
          delete this._connectedDevices[deviceId];
          onDisconnect(deviceId, interrupted, error);
        } : undefined
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
    return new Promise(async (resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      const success = await this.discoverServices(deviceId);
      if (!success) {
        reject(new Error('Failed to discover services'));
        return;
      }
      BleNitroNative.getServices(deviceId, (services: string[]) => {
        resolve(BleNitro.normalizeGattUUIDs(services));
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
        BleNitro.normalizeGattUUID(serviceId),
        (characteristics: string[]) => {
          resolve(BleNitro.normalizeGattUUIDs(characteristics));
        }
      );
    });
  }

  /**
   * Read a characteristic value
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @returns Promise resolving to the characteristic data as byte array
   */
  public readCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.readCharacteristic(
        deviceId,
        BleNitro.normalizeGattUUID(serviceId),
        BleNitro.normalizeGattUUID(characteristicId),
        (success: boolean, data: number[], error: string) => {
          if (success) {
            resolve(data);
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
        BleNitro.normalizeGattUUID(serviceId),
        BleNitro.normalizeGattUUID(characteristicId),
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
  ): Promise<Subscription> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.subscribeToCharacteristic(
        deviceId,
        BleNitro.normalizeGattUUID(serviceId),
        BleNitro.normalizeGattUUID(characteristicId),
        (charId: string, data: number[]) => {
          callback(charId, data);
        },
        (success: boolean, error: string) => {
          if (success) {
            resolve({
              remove: () => {
                return new Promise((resolve, reject) => {
                  this.unsubscribeFromCharacteristic(
                    deviceId,
                    serviceId,
                    characteristicId
                  ).then(resolve).catch(reject);
                });
              },
            });
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
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      BleNitroNative.unsubscribeFromCharacteristic(
        deviceId,
        BleNitro.normalizeGattUUID(serviceId),
        BleNitro.normalizeGattUUID(characteristicId),
        (success: boolean, error: string) => {
          if (success) {
            resolve();
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
      BleNitroNative.state((state: NativeBLEState) => {
        resolve(mapNativeBLEStateToBLEState(state));
      });
    });
  }

  /**
   * Subscribe to Bluetooth state changes
   * @param callback Callback function called when state changes
   * @param emitInitial Whether to emit initial state callback
   * @returns Promise resolving when subscription is complete
   * @see BLEState
   */
  public subscribeToStateChange(callback: (state: BLEState) => void, emitInitial = false): Promise<Subscription> {
    return new Promise(async (resolve, reject) => {
      if (emitInitial) {
        const state = await this.state().catch(() => {
          return BLEState.Unknown;
        });
        callback(state);
      }
      BleNitroNative.subscribeToStateChange((nativeState: NativeBLEState) => {
        callback(mapNativeBLEStateToBLEState(nativeState));
      }, (success: boolean, error: string) => {
        if (success) {
          resolve({
            remove: () => {
              return new Promise((resolve, reject) => {
                BleNitroNative.unsubscribeFromStateChange((success, error) => {
                  if (success) {
                    resolve();
                  } else {
                    reject(new Error(error));
                  }
                });
              });
            },
          });
        } else {
          reject(new Error(error));
        }
      });
    })
  }

  /**
   * Open Bluetooth settings
   * @returns Promise resolving when settings are opened
   */
  public openSettings(): Promise<void> {
    return BleNitroNative.openSettings();
  }
}

// Singleton instance
export const ble = BleNitro.instance();