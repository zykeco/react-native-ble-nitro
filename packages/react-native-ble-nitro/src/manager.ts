import BleNitroNativeFactory, { NativeBleNitro } from './specs/NativeBleNitroFactory';
import {
  ScanFilter as NativeScanFilter,
  BLEDevice as NativeBLEDevice,
  BLEState as NativeBLEState,
  ScanCallback as NativeScanCallback,
  AndroidScanMode as NativeAndroidScanMode,
} from './specs/NativeBleNitro';

export type ByteArray = number[];

export interface ScanFilter {
  serviceUUIDs?: string[];
  rssiThreshold?: number;
  allowDuplicates?: boolean;
  androidScanMode?: AndroidScanMode;
}

export interface ManufacturerDataEntry {
  id: string;
  data: ByteArray;
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
  isConnected: boolean;
}

export type ScanCallback = (device: BLEDevice) => void;
export type RestoreStateCallback = (connectedPeripherals: BLEDevice[]) => void;
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
  data: ByteArray
) => void;

export type Subscription = {
  remove: () => void;
};

export type AsyncSubscription = {
  remove: () => Promise<void>;
}

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

export type BleNitroManagerOptions = {
  restoreIdentifier?: string;
  onRestoredState?: RestoreStateCallback;
};

export function mapNativeBLEStateToBLEState(nativeState: NativeBLEState): BLEState {
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

export function mapAndroidScanModeToNativeAndroidScanMode(scanMode: AndroidScanMode): NativeAndroidScanMode {
  const map = {
    LowLatency: NativeAndroidScanMode.LowLatency,
    Balanced: NativeAndroidScanMode.Balanced,
    LowPower: NativeAndroidScanMode.LowPower,
    Opportunistic: NativeAndroidScanMode.Opportunistic,
  }
  return map[scanMode];
}

export function convertNativeBleDeviceToBleDevice(nativeBleDevice: NativeBLEDevice): BLEDevice {
  return {
    ...nativeBleDevice,
    serviceUUIDs: BleNitroManager.normalizeGattUUIDs(nativeBleDevice.serviceUUIDs),
    manufacturerData: {
      companyIdentifiers: nativeBleDevice.manufacturerData.companyIdentifiers.map(entry => ({
        id: entry.id,
        data: arrayBufferToByteArray(entry.data)
      }))
    }
  }
}

export function arrayBufferToByteArray(buffer: ArrayBuffer): ByteArray {
  return Array.from(new Uint8Array(buffer));
}

export function byteArrayToArrayBuffer(data: ByteArray): ArrayBuffer {
  return new Uint8Array(data).buffer;
}

export class BleNitroManager {
  private _isScanning: boolean = false;
  private _connectedDevices: { [deviceId: string]: boolean } = {};

  private _restoredStateCallback: RestoreStateCallback | null;
  private _restoredState: BLEDevice[] | null = null;
  private _restoreStateIdentifier: string | null = null;

  private Instance: NativeBleNitro;

  constructor(options?: BleNitroManagerOptions) {
    this._restoredStateCallback = options?.onRestoredState ?? null;
    this._restoreStateIdentifier = options?.restoreIdentifier ?? null;
    this.Instance = BleNitroNativeFactory.create(options?.restoreIdentifier, (peripherals: NativeBLEDevice[]) => this.onNativeRestoreStateCallback(peripherals));
  }

  private onNativeRestoreStateCallback(peripherals: NativeBLEDevice[]) {
    if (!this._restoreStateIdentifier) return;
    const bleDevices = peripherals.map((peripheral) => convertNativeBleDeviceToBleDevice(peripheral));
    bleDevices.forEach((device) => {
      this._connectedDevices[device.id] = device.isConnected;
    });
    if (this._restoredStateCallback) {
      this._restoredStateCallback(bleDevices);
    } else {
      this._restoredState = bleDevices;
    }
  }

  /**
   * 
   * Registers callback and returns restored peripheral state in it. Not working from 1.7.x upwards for singleton implementation!
   * @deprecated This method is deprecated and will be removed in 2.x, use onRestoredState option in BleNitroManageroptions instead!
   */
  public onRestoredState(callback: RestoreStateCallback) {
    if (!this._restoreStateIdentifier) return;
    if (this._restoredState) {
      callback(this._restoredState);
      this._restoredState = null;
    }
    this._restoredStateCallback = callback;
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
    return uuids.map((uuid) => BleNitroManager.normalizeGattUUID(uuid));
  }

  /**
   * Start scanning for Bluetooth devices
   * @param filter Optional scan filter
   * @param callback Callback function called when a device is found
   * @returns void
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
      const convertedDevice: BLEDevice = convertNativeBleDeviceToBleDevice(device);
      callback(convertedDevice);
    };

    // Start scan
    this.Instance.startScan(nativeFilter, scanCallback);
    this._isScanning = true;
  }

  /**
   * Stop scanning for Bluetooth devices
   * @returns void
   */
  public stopScan(): void {
    if (!this._isScanning) {
      return;
    }

    this.Instance.stopScan();
    this._isScanning = false;
  }

  /**
   * Check if currently scanning for devices
   * @returns Boolean indicating if currently scanning
   */
  public isScanning(): boolean {
    this._isScanning = this.Instance.isScanning();
    return this._isScanning;
  }

  /**
   * Get all currently connected devices
   * @param services Optional list of service UUIDs to filter by
   * @returns Array of connected devices
   */
  public getConnectedDevices(services?: string[]): BLEDevice[] {
    const devices = this.Instance.getConnectedDevices(services || []);
    // Normalize service UUIDs - manufacturer data already comes as ArrayBuffers
    return devices.map(device => convertNativeBleDeviceToBleDevice(device));
  }

  /**
   * Connect to a Bluetooth device
   * @param deviceId ID of the device to connect to
   * @param onDisconnect Optional callback for disconnect events
   * @returns Promise resolving deviceId when connected
   */
  public connect(
    deviceId: string, 
    onDisconnect?: DisconnectEventCallback,
    autoConnectAndroid?: boolean,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if already connected
      if (this._connectedDevices[deviceId]) {
        resolve(deviceId);
        return;
      }

      this.Instance.connect(
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
        } : undefined,
        autoConnectAndroid ?? false,
      );
    });
  }

  /**
   * Scans for a device and connects to it
   * @param deviceId ID of the device to connect to
   * @param scanTimeout Optional timeout for the scan in milliseconds (default: 5000ms)
   * @returns Promise resolving deviceId when connected
   */
  public findAndConnect(deviceId: string, options?: { scanTimeout?: number, autoConnectAndroid?: boolean, onDisconnect?: DisconnectEventCallback }): Promise<string> {
    const isConnected = this.isConnected(deviceId);
    if (isConnected) {
      return Promise.resolve(deviceId);
    }
    if (this._isScanning) {
      this.stopScan();
    }
    return new Promise((resolve, reject) => {
      const timeoutScan = setTimeout(() => {
        this.stopScan();
        reject(new Error('Scan timed out'));
      }, options?.scanTimeout ?? 5000);
      this.startScan(undefined, (device) => {
        if (device.id === deviceId) {
          this.stopScan();
          clearTimeout(timeoutScan);
          this.connect(deviceId, options?.onDisconnect, options?.autoConnectAndroid).then(async (connectedDeviceId) => {
            resolve(connectedDeviceId);
          }).catch((error) => {
            reject(error);
          });
        }
      });
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

      this.Instance.disconnect(
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
   * @returns Boolean indicating if device is connected
   */
  public isConnected(deviceId: string): boolean {
    return this.Instance.isConnected(deviceId);
  }

  /**
   * Request a new MTU size
   * @param deviceId ID of the device
   * @param mtu New MTU size, min is 23, max is 517
   * @returns On Android: new MTU size; on iOS: current MTU size as it is handled by iOS itself; on error: -1
   */
  public requestMTU(deviceId: string, mtu: number): number {
    mtu = parseInt(mtu.toString(), 10);
    const deviceMtu = this.Instance.requestMTU(deviceId, mtu);
    return deviceMtu;
  }

  /**
   * Read RSSI for a connected device
   * @param deviceId ID of the device
   * @returns Promise resolving to RSSI value
   */
  public readRSSI(deviceId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      this.Instance.readRSSI(
        deviceId,
        (success: boolean, rssi: number, error: string) => {
          if (success) {
            resolve(rssi);
          } else {
            reject(new Error(error));
          }
        }
      );
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

      this.Instance.discoverServices(
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
      const services = this.Instance.getServices(deviceId);
      resolve(BleNitroManager.normalizeGattUUIDs(services));
    });
  }

  /**
   * Get characteristics for a service
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @returns array of characteristic UUIDs
   */
  public getCharacteristics(
    deviceId: string,
    serviceId: string
  ): string[] {
    if (!this._connectedDevices[deviceId]) {
      throw new Error('Device not connected');
    }

    const characteristics = this.Instance.getCharacteristics(
      deviceId,
      BleNitroManager.normalizeGattUUID(serviceId),
    );
    return BleNitroManager.normalizeGattUUIDs(characteristics);
  }

  /**
   * Get services and characteristics for a connected device
   * @param deviceId ID of the device
   * @returns Promise resolving to array of service and characteristic UUIDs
   * @see getServices
   * @see getCharacteristics
   */
  public async getServicesWithCharacteristics(deviceId: string): Promise<{ uuid: string; characteristics: string[] }[]> {
    await this.discoverServices(deviceId);
    const services = await this.getServices(deviceId);
    return services.map((service) => {
      return {
        uuid: service,
        characteristics: this.getCharacteristics(deviceId, service),
      };
    });
  }

  /**
   * Read a characteristic value
   * @param deviceId ID of the device
   * @param serviceId ID of the service
   * @param characteristicId ID of the characteristic
   * @returns Promise resolving to the characteristic data as ByteArray
   */
  public readCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<ByteArray> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      this.Instance.readCharacteristic(
        deviceId,
        BleNitroManager.normalizeGattUUID(serviceId),
        BleNitroManager.normalizeGattUUID(characteristicId),
        (success: boolean, data: ArrayBuffer, error: string) => {
          if (success) {
            resolve(arrayBufferToByteArray(data));
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
   * @param data Data to write as ByteArray (number[])
   * @param withResponse Whether to wait for response
   * @returns Promise resolving with response data (empty ByteArray when withResponse=false)
   */
  public writeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    data: ByteArray,
    withResponse: boolean = true
  ): Promise<ByteArray> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      this.Instance.writeCharacteristic(
        deviceId,
        BleNitroManager.normalizeGattUUID(serviceId),
        BleNitroManager.normalizeGattUUID(characteristicId),
        byteArrayToArrayBuffer(data),
        withResponse,
        (success: boolean, responseData: ArrayBuffer, error: string) => {
          if (success) {
            // Convert ArrayBuffer response to ByteArray
            const responseByteArray = arrayBufferToByteArray(responseData);
            resolve(responseByteArray);
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
   * @returns Promise resolving to AsyncSubscription when subscription is established
   */
  public async subscribeToCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    callback: CharacteristicUpdateCallback
  ): Promise<AsyncSubscription> {
    return new Promise((resolve, reject) => {
      // Check if connected first
      if (!this._connectedDevices[deviceId]) {
        reject(new Error('Device not connected'));
        return;
      }

      this.Instance.subscribeToCharacteristic(
        deviceId,
        BleNitroManager.normalizeGattUUID(serviceId),
        BleNitroManager.normalizeGattUUID(characteristicId),
        (charId: string, data: ArrayBuffer) => {
          callback(charId, arrayBufferToByteArray(data));
        },
        (success: boolean, error: string) => {
          if (!success) {
            reject(new Error(error || 'Failed to subscribe to characteristic'));
            return;
          }

          const sub: AsyncSubscription = {
            remove: async () => {
              await this.unsubscribeFromCharacteristic(
                deviceId,
                serviceId,
                characteristicId
              ).catch(() => {});
            }
          };

          resolve(sub);
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

      this.Instance.unsubscribeFromCharacteristic(
        deviceId,
        BleNitroManager.normalizeGattUUID(serviceId),
        BleNitroManager.normalizeGattUUID(characteristicId),
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
   * @returns returns Boolean according to Bluetooth state
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
      this.Instance.requestBluetoothEnable(
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
   * @returns Bluetooth state
   * @see BLEState
   */
  public state(): BLEState {
    return mapNativeBLEStateToBLEState(this.Instance.state());
  }

  /**
   * Subscribe to Bluetooth state changes
   * @param callback Callback function called when state changes
   * @param emitInitial Whether to emit initial state callback
   * @returns Subscription
   * @see BLEState
   */
  public subscribeToStateChange(callback: (state: BLEState) => void, emitInitial = false): Subscription {
      if (emitInitial) {
        const state = this.state();
        callback(state);
      }

      this.Instance.subscribeToStateChange((nativeState: NativeBLEState) => {
        callback(mapNativeBLEStateToBLEState(nativeState));
      });

      return {
        remove: () => {
          this.Instance.unsubscribeFromStateChange();
        },
      };
  }

  /**
   * Open Bluetooth settings
   * @returns Promise resolving when settings are opened
   */
  public openSettings(): Promise<void> {
    return this.Instance.openSettings();
  }
}
