import type { HybridObject } from 'react-native-nitro-modules';
import type {
  Identifier,
  UUID,
  DeviceId,
  Base64,
  TransactionId,
  CharacteristicSubscriptionType,
  NativeCharacteristic,
  NativeDescriptor,
  CharacteristicMonitorListener,
  Subscription
} from './types';

export interface Service extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Service properties
  readonly id: Identifier;
  readonly uuid: UUID;
  readonly deviceID: DeviceId;
  readonly isPrimary: boolean;

  // Characteristic operations
  characteristics(): Promise<NativeCharacteristic[]>;

  readCharacteristic(
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  writeCharacteristicWithoutResponse(
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic>;

  monitorCharacteristic(
    characteristicUUID: UUID,
    listener: CharacteristicMonitorListener,
    transactionId?: TransactionId,
    subscriptionType?: CharacteristicSubscriptionType
  ): Subscription;

  // Descriptor operations
  descriptorsForCharacteristic(characteristicUUID: UUID): Promise<NativeDescriptor[]>;

  readDescriptorForCharacteristic(
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;

  writeDescriptorForCharacteristic(
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;
}