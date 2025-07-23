import type { HybridObject } from 'react-native-nitro-modules';
import type {
  State,
  LogLevel,
  UUID,
  DeviceId,
  TransactionId,
  ConnectionPriority,
  ScanOptions,
  ConnectionOptions,
  StateListener,
  DeviceScanListener,
  DeviceDisconnectedListener,
  CharacteristicMonitorListener,
  CharacteristicSubscriptionType,
  NativeDevice,
  NativeService,
  NativeCharacteristic,
  NativeDescriptor,
  Base64,
  Subscription
} from './types';

// Nitro-compatible options interface (simplified without functions)
export interface BleManagerNitroOptions {
  restoreStateIdentifier?: string;
}

// Interface for restored state data
export interface BleRestoredState {
  connectedPeripherals: NativeDevice[];
}

export interface BleManager extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Lifecycle
  destroy(): Promise<void>;

  // Initialization - Configure the BLE manager with options
  initialize(options: BleManagerNitroOptions): Promise<void>;

  // Get restored state if available (called after initialization)
  getRestoredState(): Promise<BleRestoredState | null>;

  // Common operations
  setLogLevel(logLevel: LogLevel): Promise<LogLevel>;
  logLevel(): Promise<LogLevel>;
  cancelTransaction(transactionId: TransactionId): Promise<void>;

  // State management
  enable(transactionId?: TransactionId): Promise<void>;
  disable(transactionId?: TransactionId): Promise<void>;
  state(): Promise<State>;
  onStateChange(listener: StateListener, emitCurrentState?: boolean): Subscription;

  // Device scanning
  startDeviceScan(
    uuids: UUID[] | null,
    options: ScanOptions | null,
    listener: DeviceScanListener
  ): Promise<void>;
  stopDeviceScan(): Promise<void>;

  // Connection priority and RSSI/MTU requests
  requestConnectionPriorityForDevice(
    deviceIdentifier: DeviceId,
    connectionPriority: ConnectionPriority,
    transactionId?: TransactionId
  ): Promise<NativeDevice>;

  readRSSIForDevice(
    deviceIdentifier: DeviceId,
    transactionId?: TransactionId
  ): Promise<NativeDevice>;

  requestMTUForDevice(
    deviceIdentifier: DeviceId,
    mtu: number,
    transactionId?: TransactionId
  ): Promise<NativeDevice>;

  // Connection management
  devices(deviceIdentifiers: DeviceId[]): Promise<NativeDevice[]>;
  connectedDevices(serviceUUIDs: UUID[]): Promise<NativeDevice[]>;
  connectToDevice(
    deviceIdentifier: DeviceId,
    options?: ConnectionOptions
  ): Promise<NativeDevice>;
  cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<NativeDevice>;
  onDeviceDisconnected(
    deviceIdentifier: DeviceId,
    listener: DeviceDisconnectedListener
  ): Subscription;
  isDeviceConnected(deviceIdentifier: DeviceId): Promise<boolean>;

  // Service and characteristic discovery
  discoverAllServicesAndCharacteristicsForDevice(
    deviceIdentifier: DeviceId,
    transactionId?: TransactionId
  ): Promise<NativeDevice>;

  // Service operations
  servicesForDevice(deviceIdentifier: DeviceId): Promise<NativeService[]>;

  // Characteristic operations
  characteristicsForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID
  ): Promise<NativeCharacteristic[]>;

  readCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  monitorCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: CharacteristicMonitorListener,
    transactionId?: TransactionId,
    subscriptionType?: CharacteristicSubscriptionType
  ): Subscription;

  // Descriptor operations
  descriptorsForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ): Promise<NativeDescriptor[]>;

  readDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;

  writeDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;
}