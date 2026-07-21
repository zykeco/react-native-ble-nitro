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

export enum NativeGattCharacteristicProperty {
  Broadcast = 1,
  Read = 2,
  WriteWithoutResponse = 4,
  Write = 8,
  Notify = 16,
  Indicate = 32,
  AuthenticatedSignedWrites = 64,
}

export enum NativeGattCharacteristicPermission {
  Read = 1,
  Write = 2,
  ReadEncrypted = 4,
  ReadEncryptedMITM = 8,
  WriteEncrypted = 16,
  WriteEncryptedMITM = 32,
  WriteSigned = 64,
  WriteSignedMITM = 128,
}

export enum NativeGattServerEventType {
  AdvertisingStarted = 0,
  AdvertisingStopped = 1,
  DeviceConnected = 2,
  DeviceDisconnected = 3,
  CharacteristicRead = 4,
  CharacteristicWrite = 5,
  NotificationSubscribed = 6,
  NotificationUnsubscribed = 7,
  Error = 8,
  MtuChanged = 9,
}

export enum AndroidGattServerAdvertiseMode {
  LowPower = 0,
  Balanced = 1,
  LowLatency = 2,
}

export enum AndroidGattServerAdvertiseTxPowerLevel {
  UltraLow = 0,
  Low = 1,
  Medium = 2,
  High = 3,
}

export interface ScanFilter {
  serviceUUIDs: string[];
  rssiThreshold: number;
  allowDuplicates: boolean;
  androidScanMode: AndroidScanMode;
}

export interface GattServerCharacteristic {
  uuid: string;
  properties: number;
  permissions: number;
  value: BLEValue;
}

export interface GattServerService {
  uuid: string;
  primary: boolean;
  characteristics: GattServerCharacteristic[];
}

export interface GattServerAdvertisingOptions {
  enabled: boolean;
  serviceUUIDs: string[];
  localName: string;
  includeDeviceName: boolean;
  includeTxPowerLevel: boolean;
  androidAdvertiseMode: AndroidGattServerAdvertiseMode;
  androidTxPowerLevel: AndroidGattServerAdvertiseTxPowerLevel;
  androidConnectable: boolean;
}

export interface GattServerOptions {
  services: GattServerService[];
  advertising: GattServerAdvertisingOptions;
}

export interface GattServerEvent {
  type: NativeGattServerEventType;
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  descriptorId: string;
  data: BLEValue;
  isSubscribed: boolean;
  mtu: number;
  error: string;
}

export type ScanCallback = (device: BLEDevice | null, error: string | null) => void;
export type DevicesCallback = (devices: BLEDevice[]) => void;
export type ConnectionCallback = (success: boolean, deviceId: string, error: string) => void;
export type DisconnectionEventCallback = (deviceId: string, interrupted: boolean, error: string) => void;
export type OperationCallback = (success: boolean, error: string) => void;
export type CharacteristicCallback = (characteristicId: string, data: BLEValue) => void;
export type StateCallback = (state: BLEState) => void;
export type BooleanCallback = (result: boolean) => void;
export type StringArrayCallback = (result: string[]) => void;
export type ReadCharacteristicCallback = (success: boolean, data: BLEValue, error: string) => void;
export type WriteCharacteristicCallback = (success: boolean, responseData: BLEValue, error: string) => void;
export type ReadRSSICallback = (success: boolean, rssi: number, error: string) => void;
export type GattServerNotificationCallback = (
  success: boolean,
  queuedDeviceIds: string[],
  error: string
) => void;
export type RestoreCallback = (restoredPeripherals: BLEDevice[]) => void;
export type GattServerEventCallback = (event: GattServerEvent) => void;

export type OperationResult = {
  success: boolean;
  error?: string;
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

  // GATT server operations
  startGattServer(options: GattServerOptions, eventCallback: GattServerEventCallback, callback: OperationCallback): void;
  stopGattServer(callback: OperationCallback): void;
  isGattServerRunning(): boolean;
  isGattServerAdvertising(): boolean;
  getGattServerConnectedDevices(): string[];
  getGattServerDeviceMTU(deviceId: string): number;
  setGattServerCharacteristicValue(serviceId: string, characteristicId: string, data: BLEValue, callback: OperationCallback): void;
  notifyGattServerCharacteristicChanged(deviceId: string, serviceId: string, characteristicId: string, data: BLEValue, callback: GattServerNotificationCallback): void;
  disconnectGattServerDevice(deviceId: string, callback: OperationCallback): void;

  // Bluetooth state management
  requestBluetoothEnable(callback: OperationCallback): void;
  state(): BLEState;
  subscribeToStateChange(stateCallback: StateCallback): OperationResult;
  unsubscribeFromStateChange(): OperationResult;
  openSettings(): Promise<void>;
}
