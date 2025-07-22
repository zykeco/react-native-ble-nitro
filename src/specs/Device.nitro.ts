import type { HybridObject } from 'react-native-nitro-modules';
import type {
  DeviceId,
  UUID,
  Base64,
  TransactionId,
  ConnectionPriority,
  ConnectionOptions,
  CharacteristicSubscriptionType,
  ServiceDataEntry,
  NativeDevice,
  NativeService,
  NativeCharacteristic,
  NativeDescriptor,
  DeviceDisconnectedListener,
  CharacteristicMonitorListener,
  Subscription
} from './types.js';

export interface Device extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Device properties
  readonly id: DeviceId;
  readonly deviceName?: string | null;
  readonly rssi?: number | null;
  readonly mtu: number;
  readonly manufacturerData?: Base64 | null;
  readonly rawScanRecord: Base64;
  readonly serviceData?: ServiceDataEntry[] | null;
  readonly serviceUUIDs?: UUID[] | null;
  readonly localName?: string | null;
  readonly txPowerLevel?: number | null;
  readonly solicitedServiceUUIDs?: UUID[] | null;
  readonly isConnectable?: boolean | null;
  readonly overflowServiceUUIDs?: UUID[] | null;

  // Connection management
  requestConnectionPriority(
    connectionPriority: ConnectionPriority,
    transactionId?: TransactionId
  ): Promise<NativeDevice>;

  readRSSI(transactionId?: TransactionId): Promise<NativeDevice>;
  requestMTU(mtu: number, transactionId?: TransactionId): Promise<NativeDevice>;
  connect(options?: ConnectionOptions): Promise<NativeDevice>;
  cancelConnection(): Promise<NativeDevice>;
  isConnected(): Promise<boolean>;
  onDisconnected(listener: DeviceDisconnectedListener): Subscription;

  // Service discovery
  discoverAllServicesAndCharacteristics(transactionId?: TransactionId): Promise<NativeDevice>;
  services(): Promise<NativeService[]>;

  // Characteristic operations
  characteristicsForService(serviceUUID: UUID): Promise<NativeCharacteristic[]>;

  readCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithoutResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  monitorCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: CharacteristicMonitorListener,
    transactionId?: TransactionId,
    subscriptionType?: CharacteristicSubscriptionType
  ): Subscription;

  // Descriptor operations
  descriptorsForService(
    serviceUUID: UUID,
    characteristicUUID: UUID
  ): Promise<NativeDescriptor[]>;

  readDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;

  writeDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;
}