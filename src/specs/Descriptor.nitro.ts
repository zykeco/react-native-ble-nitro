import type { HybridObject } from 'react-native-nitro-modules';
import type {
  Identifier,
  UUID,
  DeviceId,
  Base64,
  TransactionId
} from './types.js';

export interface Descriptor extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Descriptor properties
  readonly id: Identifier;
  readonly uuid: UUID;
  readonly characteristicID: Identifier;
  readonly characteristicUUID: UUID;
  readonly serviceID: Identifier;
  readonly serviceUUID: UUID;
  readonly deviceID: DeviceId;
  readonly value: Base64 | null;

  // Descriptor operations
  read(transactionId?: TransactionId): Promise<Descriptor>;

  write(
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<Descriptor>;
}