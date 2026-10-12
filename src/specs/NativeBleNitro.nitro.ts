import { HybridObject } from 'react-native-nitro-modules';

// Type alias for BLE data - ArrayBuffers for efficient binary data handling
export type BLEValue = ArrayBuffer;

// Nitro constraint: Use numeric enums instead of string unions
export enum BLEState {
  Unknown = 0,
  Resetting = 1,
  Unsupported = 2,
  Unauthorized = 3,
  PoweredOff = 4,
  PoweredOn = 5,
}

export interface ManufacturerDataEntry {
  id: string;
  data: BLEValue;
}

export interface ManufacturerData {
  companyIdentifiers: ManufacturerDataEntry[];
}

export interface ServiceDataEntry {
  uuid: string;
  data: BLEValue;
}

export interface ServiceData {
  services: ServiceDataEntry[];
}

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData: ManufacturerData;
  serviceData: ServiceData;
  serviceUUIDs: string[];
  isConnectable: boolean;
  isConnected: boolean;
}

export enum AndroidScanMode {
  LowLatency = 0,
  Balanced = 1,
  LowPower = 2,
  Opportunistic = 3,
}

export enum AndroidConnectionPriority {
  Balanced = 0,
  High = 1,
  LowPower = 2,
}

export interface ScanFilter {
  serviceUUIDs: string[];
  rssiThreshold: number;
  allowDuplicates: boolean;
  androidScanMode: AndroidScanMode;
}

/**
 * Error codes for failures the library itself detects or decides, carried on
 * `BLENativeError.libraryCode`. Some are raised only by the JS layer (e.g.
 * `TIMEOUT`), but live here so all three platforms share one definition.
 *
 * Members are UPPER_SNAKE (unlike the PascalCase enums above) because nitrogen
 * maps UPPER_SNAKE to camelCase Swift cases (`.deviceNotConnected`), whereas
 * PascalCase would be flattened to `.devicenotconnected`.
 */
export enum BleNitroLibraryErrorCode {
  UNKNOWN = 0,
  DEVICE_NOT_CONNECTED = 1,
  DEVICE_NOT_FOUND = 2,
  SERVICE_NOT_FOUND = 3,
  CHARACTERISTIC_NOT_FOUND = 4,
  PERMISSION_DENIED = 5,
  BLUETOOTH_UNAVAILABLE = 6,
  CONTEXT_UNAVAILABLE = 7,
  OPERATION_INITIATION_FAILED = 8,
  CONNECTION_STATE_NOT_FOUND = 9,
  DISCONNECTED_DURING_OPERATION = 10,
  DATA_ERROR = 11,
  NATIVE_EXCEPTION = 12,
  CONNECTION_CANCELLED = 13,
  CHARACTERISTIC_NOT_SUPPORTED = 14,
  OPERATION_NOT_SUPPORTED = 15,
  SERVICES_CHANGED = 16,
  TIMEOUT = 17,
}

/**
 * An error crossing the native boundary: either a raw platform error
 * (`domain`/`code` passed through untouched, no `libraryCode`) or a library
 * error (`domain` is `bleNitro.library` and `libraryCode` is set).
 */
export interface BLENativeError {
  domain: string;
  code: number;
  message: string;
  /** Set only for `bleNitro.library` errors; mirrors `code` as a typed enum.
   * Declared in the spec to generate the matching Kotlin and Swift enums */
  libraryCode?: BleNitroLibraryErrorCode;
}

export type ScanCallback = (device: BLEDevice | null, error?: BLENativeError) => void;
export type DevicesCallback = (devices: BLEDevice[]) => void;
export type ConnectionCallback = (success: boolean, deviceId: string, error?: BLENativeError) => void;
export type DisconnectionEventCallback = (deviceId: string, interrupted: boolean, error?: BLENativeError) => void;
export type OperationCallback = (success: boolean, error?: BLENativeError) => void;
export type CharacteristicCallback = (characteristicId: string, data: BLEValue) => void;
export type StateCallback = (state: BLEState) => void;
export type BooleanCallback = (result: boolean) => void;
export type StringArrayCallback = (result: string[]) => void;
export type ReadCharacteristicCallback = (success: boolean, data: BLEValue, error?: BLENativeError) => void;
export type WriteCharacteristicCallback = (success: boolean, responseData: BLEValue, error?: BLENativeError) => void;
export type ReadRSSICallback = (success: boolean, rssi: number, error?: BLENativeError) => void;
export type RestoreCallback = (restoredPeripherals: BLEDevice[]) => void;

export type OperationResult = {
  success: boolean;
  error?: BLENativeError;
};

/**
 * Native BLE Nitro Module Specification
 * Defines the interface between TypeScript and native implementations
 */
export interface NativeBleNitro extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // ios only
  restoreStateIdentifier?: string;
  setRestoreStateCallback(callback: RestoreCallback): void;
  iosLazyInit(): void;

  // Scanning operations
  startScan(filter: ScanFilter, callback: ScanCallback): void;
  stopScan(): boolean;
  isScanning(): boolean;

  // Device discovery
  getConnectedDevices(services: string[]): BLEDevice[];

  // Connection management
  connect(deviceId: string, callback: ConnectionCallback, disconnectCallback?: DisconnectionEventCallback, autoConnectAndroid?: boolean): void;
  disconnect(deviceId: string, callback: OperationCallback): void;
  isConnected(deviceId: string): boolean;
  requestMTU(deviceId: string, mtu: number): number;
  requestConnectionPriority(deviceId: string, androidConnectionPriority: AndroidConnectionPriority): boolean;
  readRSSI(deviceId: string, callback: ReadRSSICallback): void;

  // Service discovery
  discoverServices(deviceId: string, callback: OperationCallback): void;
  /** Discover services and wait for all characteristic discovery to complete before resolving. */
  discoverServicesWithCharacteristics(deviceId: string, callback: OperationCallback): void;
  getServices(deviceId: string): string[];
  getCharacteristics(deviceId: string, serviceId: string): string[];

  // Characteristic operations
  readCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: ReadCharacteristicCallback): void;
  writeCharacteristic(deviceId: string, serviceId: string, characteristicId: string, data: BLEValue, withResponse: boolean, callback: WriteCharacteristicCallback): void;
  subscribeToCharacteristic(deviceId: string, serviceId: string, characteristicId: string, updateCallback: CharacteristicCallback, completionCallback: OperationCallback): void;
  unsubscribeFromCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: OperationCallback): void;
  isSubscribedToCharacteristic(deviceId: string, serviceId: string, characteristicId: string): boolean;

  // Bluetooth state management
  requestBluetoothEnable(callback: OperationCallback): void;
  state(): BLEState;
  subscribeToStateChange(stateCallback: StateCallback): OperationResult;
  unsubscribeFromStateChange(): OperationResult;
  openSettings(): Promise<void>;
}
