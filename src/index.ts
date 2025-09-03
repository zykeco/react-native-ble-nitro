import BleNitroNative from './specs/NativeBleNitro';
import {
  ScanFilter as NativeScanFilter,
  BLEDevice as NativeBLEDevice,
  BLEState as NativeBLEState,
  ScanCallback as NativeScanCallback,
  AndroidScanMode as NativeAndroidScanMode,
} from './specs/NativeBleNitro';


export interface ScanFilter {
  serviceUUIDs?: string[];
  rssiThreshold?: number;
  allowDuplicates?: boolean;
  androidScanMode?: AndroidScanMode;
}

export interface ManufacturerDataEntry {
  id: string;
  data: ArrayBuffer;
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
  data: ArrayBuffer
) => void;

export type Subscription = {
  remove: () => void;
};

export enum BLEState {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn',
};

export enum AndroidScanMode {
  LowLatency = 'LowLatency',
  Balanced = 'Balanced',
  LowPower = 'LowPower',
  Opportunistic = 'Opportunistic',
}

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

function mapAndroidScanModeToNativeAndroidScanMode(scanMode: AndroidScanMode): NativeAndroidScanMode {
  const map = {
    LowLatency: NativeAndroidScanMode.LowLatency,
    Balanced: NativeAndroidScanMode.Balanced,
    LowPower: NativeAndroidScanMode.LowPower,
    Opportunistic: NativeAndroidScanMode.Opportunistic,
  }
  return map[scanMode];
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
    callback: ScanCallback,
    onError?: (error: string) => void,
  ): void {
    if (this._isScanning) {
      return;
    }

    // Create native scan filter with defaults
    const nativeFilter: NativeScanFilter = {
      serviceUUIDs: filter.serviceUUIDs || [],
      rssiThreshold: filter.rssiThreshold ?? -100,
      allowDuplicates: filter.allowDuplicates ?? false,
      androidScanMode: mapAndroidScanModeToNativeAndroidScanMode(filter.androidScanMode ?? AndroidScanMode.Balanced),
    };

    // Create callback wrapper
    const scanCallback: NativeScanCallback = (device: NativeBLEDevice | null, error: string | null) => {
      if (error && !device) {
        this._isScanning = false;
        onError?.(error);
        return;
      }
      device = device!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      // Convert manufacturer data to Uint8Arrays
      const convertedDevice: BLEDevice = {
        ...device,
        serviceUUIDs: BleNitro.normalizeGattUUIDs(device.serviceUUIDs),
        manufacturerData: {
          companyIdentifiers: device.manufacturerData.companyIdentifiers.map(entry => ({
            id: entry.id,
            data: entry.data
          }))
        }
      };
      callback(convertedDevice);
    };

    // Start scan
    BleNitroNative.startScan(nativeFilter, scanCallback);
    this._isScanning = true;
  }

  /**
   * Stop scanning for Bluetooth devices
   * @returns Promise resolving to success state
   */
  public stopScan(): void {
    if (!this._isScanning) {
      return;
    }

    BleNitroNative.stopScan();
    this._isScanning = false;
  }

  /**
   * Check if currently scanning for devices
   * @returns Promise resolving to scanning state
   */
  public isScanning(): boolean {
    this._isScanning = BleNitroNative.isScanning();
    return this._isScanning;
  }

  /**
   * Get all currently connected devices
   * @param services Optional list of service UUIDs to filter by
   * @returns Array of connected devices
   */
  public getConnectedDevices(services?: string[]): BLEDevice[] {
    const devices = BleNitroNative.getConnectedDevices(services || []);
    // Normalize service UUIDs - manufacturer data already comes as ArrayBuffers
    return devices.map(device => ({
      ...device,
      serviceUUIDs: BleNitro.normalizeGattUUIDs(device.serviceUUIDs),
      manufacturerData: {
        companyIdentifiers: device.manufacturerData.companyIdentifiers.map(entry => ({
          id: entry.id,
          data: entry.data
        }))
      }
    }));
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
  public disconnect(deviceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already disconnected
      if (!this._connectedDevices[deviceId]) {
        resolve();
        return;
      }

      BleNitroNative.disconnect(
        deviceId,
        (success: boolean, error: string) => {
          if (success) {
            delete this._connectedDevices[deviceId];
            resolve();
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
  public isConnected(deviceId: string): boolean {
    return BleNitroNative.isConnected(deviceId);
  }

  /**
   * Request a new MTU size
   * @param deviceId ID of the device
   * @param mtu New MTU size, min is 23, max is 517
   * @returns On Android: new MTU size; on iOS: current MTU size as it is handled by iOS itself; on error: -1
   */
  public requestMTU(deviceId: string, mtu: number): number {
    mtu = parseInt(mtu.toString(), 10);
    const deviceMtu = BleNitroNative.requestMTU(deviceId, mtu);
    return deviceMtu;
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
      const services = BleNitroNative.getServices(deviceId);
      resolve(BleNitro.normalizeGattUUIDs(services));
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
  ): string[] {
    if (!this._connectedDevices[deviceId]) {
      throw new Error('Device not connected');
    }

    const characteristics = BleNitroNative.getCharacteristics(
      deviceId,
      BleNitro.normalizeGattUUID(serviceId),
    );
    return BleNitro.normalizeGattUUIDs(characteristics);
  }

  /**
   * Read a characteristic value
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @returns Promise resolving to the characteristic data as ArrayBuffer
   */
  public readCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<ArrayBuffer> {
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
        (success: boolean, data: ArrayBuffer, error: string) => {
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
   * @param data Data to write as ArrayBuffer
   * @param withResponse Whether to wait for response
   * @returns Promise resolving when write is complete
   */
  public writeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    data: ArrayBuffer,
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
  ): Subscription {
    // Check if connected first
    if (!this._connectedDevices[deviceId]) {
      throw new Error('Device not connected');
    }

    let _success = false;

    BleNitroNative.subscribeToCharacteristic(
      deviceId,
      BleNitro.normalizeGattUUID(serviceId),
      BleNitro.normalizeGattUUID(characteristicId),
      (charId: string, data: ArrayBuffer) => {
        callback(charId, data);
      },
      (success, error) => {
        _success = success;
        if (!success) {
          throw new Error(error);
        }
      }
    );

    return {
      remove: () => {
        if (!_success) {
          return;
        }
        this.unsubscribeFromCharacteristic(
          deviceId,
          serviceId,
          characteristicId
        ).catch(() => {});
      }
    };
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
  public isBluetoothEnabled(): boolean {
    return this.state() === BLEState.PoweredOn;
  }

  /**
   * Request to enable Bluetooth (Android only)
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
  public state(): BLEState {
    return mapNativeBLEStateToBLEState(BleNitroNative.state());
  }

  /**
   * Subscribe to Bluetooth state changes
   * @param callback Callback function called when state changes
   * @param emitInitial Whether to emit initial state callback
   * @returns Promise resolving when subscription is complete
   * @see BLEState
   */
  public subscribeToStateChange(callback: (state: BLEState) => void, emitInitial = false): Subscription {
      if (emitInitial) {
        const state = this.state();
        callback(state);
      }

      BleNitroNative.subscribeToStateChange((nativeState: NativeBLEState) => {
        callback(mapNativeBLEStateToBLEState(nativeState));
      });

      return {
        remove: () => {
          BleNitroNative.unsubscribeFromStateChange();
        },
      };
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