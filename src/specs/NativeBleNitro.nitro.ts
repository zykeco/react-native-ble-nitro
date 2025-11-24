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

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData: ManufacturerData;
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

export interface ScanFilter {
  serviceUUIDs: string[];
  rssiThreshold: number;
  allowDuplicates: boolean;
  androidScanMode: AndroidScanMode;
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
export type RestoreCallback = (restoredPeripherals: BLEDevice[]) => void;

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
  readRSSI(deviceId: string, callback: ReadRSSICallback): void;

  // Service discovery
  discoverServices(deviceId: string, callback: OperationCallback): void;
  getServices(deviceId: string): string[];
  getCharacteristics(deviceId: string, serviceId: string): string[];

  // Characteristic operations
  readCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: ReadCharacteristicCallback): void;
  writeCharacteristic(deviceId: string, serviceId: string, characteristicId: string, data: BLEValue, withResponse: boolean, callback: WriteCharacteristicCallback): void;
  subscribeToCharacteristic(deviceId: string, serviceId: string, characteristicId: string, updateCallback: CharacteristicCallback, completionCallback: OperationCallback): void;
  unsubscribeFromCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: OperationCallback): void;

  // Bluetooth state management
  requestBluetoothEnable(callback: OperationCallback): void;
  state(): BLEState;
  subscribeToStateChange(stateCallback: StateCallback): OperationResult;
  unsubscribeFromStateChange(): OperationResult;
  openSettings(): Promise<void>;
}