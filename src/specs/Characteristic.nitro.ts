import type { HybridObject } from 'react-native-nitro-modules';
import type {
  Identifier,
  UUID,
  DeviceId,
  Base64,
  TransactionId,
  CharacteristicSubscriptionType,
  NativeDescriptor,
  CharacteristicMonitorListener,
  Subscription
} from './types';

export interface Characteristic extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Characteristic properties
  readonly id: Identifier;
  readonly uuid: UUID;
  readonly serviceID: Identifier;
  readonly serviceUUID: UUID;
  readonly deviceID: DeviceId;
  readonly isReadable: boolean;
  readonly isWritableWithResponse: boolean;
  readonly isWritableWithoutResponse: boolean;
  readonly isNotifiable: boolean;
  readonly isNotifying: boolean;
  readonly isIndicatable: boolean;
  readonly value: Base64 | null;

  // Characteristic operations
  read(transactionId?: TransactionId): Promise<Characteristic>;

  writeWithResponse(
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<Characteristic>;

  writeWithoutResponse(
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<Characteristic>;

  monitor(
    listener: CharacteristicMonitorListener,
    transactionId?: TransactionId,
    subscriptionType?: CharacteristicSubscriptionType
  ): Subscription;

  // Descriptor operations
  descriptors(): Promise<NativeDescriptor[]>;

  readDescriptor(
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;

  writeDescriptor(
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor>;
}