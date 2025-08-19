import { HybridObject } from 'react-native-nitro-modules';

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

export interface ScanFilter {
  serviceUUIDs: string[];
  rssiThreshold: number;
  allowDuplicates: boolean;
}

export type ScanCallback = (device: BLEDevice) => void;
export type ConnectionCallback = (success: boolean, deviceId: string, error: string) => void;
export type OperationCallback = (success: boolean, error: string) => void;
export type CharacteristicCallback = (characteristicId: string, data: number[]) => void;
export type StateCallback = (state: BLEState) => void;
export type BooleanCallback = (result: boolean) => void;
export type StringArrayCallback = (result: string[]) => void;

/**
 * Native BLE Nitro Module Specification
 * Defines the interface between TypeScript and native implementations
 */
export interface NativeBleNitro extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Scanning operations
  startScan(filter: ScanFilter, callback: ScanCallback): void;
  stopScan(callback: OperationCallback): void;
  isScanning(callback: BooleanCallback): void;

  // Connection management
  connect(deviceId: string, callback: ConnectionCallback): void;
  disconnect(deviceId: string, callback: OperationCallback): void;
  isConnected(deviceId: string, callback: BooleanCallback): void;

  // Service discovery
  discoverServices(deviceId: string, callback: OperationCallback): void;
  getServices(deviceId: string, callback: StringArrayCallback): void;
  getCharacteristics(deviceId: string, serviceId: string, callback: StringArrayCallback): void;

  // Characteristic operations
  readCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: OperationCallback): void;
  writeCharacteristic(deviceId: string, serviceId: string, characteristicId: string, data: number[], withResponse: boolean, callback: OperationCallback): void;
  subscribeToCharacteristic(deviceId: string, serviceId: string, characteristicId: string, updateCallback: CharacteristicCallback, resultCallback: OperationCallback): void;
  unsubscribeFromCharacteristic(deviceId: string, serviceId: string, characteristicId: string, callback: OperationCallback): void;

  // Bluetooth state management
  isBluetoothEnabled(callback: BooleanCallback): void;
  requestBluetoothEnable(callback: OperationCallback): void;
  state(callback: StateCallback): void;
  subscribeToStateChange(stateCallback: StateCallback, resultCallback: OperationCallback): void;
}