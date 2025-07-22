/**
 * Device wrapper for compatibility
 * 
 * Wraps Nitro Device objects to provide the original react-native-ble-plx API
 */

import type { Device as NitroDevice } from '../specs/Device.nitro.js';
import type { 
  NativeDevice, 
  UUID, 
  Base64, 
  DeviceId,
  TransactionId,
  ConnectionPriority,
  ConnectionOptions,
  ServiceDataEntry,
  NativeService,
  NativeCharacteristic,
  NativeDescriptor,
  CharacteristicSubscriptionType,
  Subscription
} from '../specs/types.js';
import { serviceDataArrayToMap } from './serviceData.js';
import { 
  normalizeCharacteristicSubscriptionType,
  stateToString,
  characteristicSubscriptionTypeToString 
} from './enums.js';

/**
 * Device wrapper that provides react-native-ble-plx compatibility
 * Maps Nitro device properties to the expected API surface
 */
export class DeviceWrapper {
  constructor(private nitroDevice: NitroDevice | any) {}

  // Device identification
  get id(): DeviceId {
    return this.nitroDevice.id;
  }

  // Map deviceName back to name for compatibility
  get name(): string | null {
    return this.nitroDevice.deviceName || null;
  }

  get rssi(): number | null {
    return this.nitroDevice.rssi || null;
  }

  get mtu(): number {
    return this.nitroDevice.mtu;
  }

  // Advertisement data
  get manufacturerData(): Base64 | null {
    return this.nitroDevice.manufacturerData || null;
  }

  get rawScanRecord(): Base64 {
    return this.nitroDevice.rawScanRecord;
  }

  // Convert ServiceDataEntry[] back to { [uuid: string]: Base64 }
  get serviceData(): { [uuid: string]: Base64 } | null {
    return serviceDataArrayToMap(this.nitroDevice.serviceData || null);
  }

  get serviceUUIDs(): UUID[] | null {
    return this.nitroDevice.serviceUUIDs || null;
  }

  get localName(): string | null {
    return this.nitroDevice.localName || null;
  }

  get txPowerLevel(): number | null {
    return this.nitroDevice.txPowerLevel || null;
  }

  get solicitedServiceUUIDs(): UUID[] | null {
    return this.nitroDevice.solicitedServiceUUIDs || null;
  }

  get isConnectable(): boolean | null {
    return this.nitroDevice.isConnectable || null;
  }

  get overflowServiceUUIDs(): UUID[] | null {
    return this.nitroDevice.overflowServiceUUIDs || null;
  }

  // Connection management methods
  async requestConnectionPriority(
    connectionPriority: ConnectionPriority,
    transactionId?: TransactionId
  ): Promise<DeviceWrapper> {
    const result = await this.nitroDevice.requestConnectionPriority(connectionPriority, transactionId);
    return new DeviceWrapper(result);
  }

  async readRSSI(transactionId?: TransactionId): Promise<DeviceWrapper> {
    const result = await this.nitroDevice.readRSSI(transactionId);
    return new DeviceWrapper(result);
  }

  async requestMTU(mtu: number, transactionId?: TransactionId): Promise<DeviceWrapper> {
    const result = await this.nitroDevice.requestMTU(mtu, transactionId);
    return new DeviceWrapper(result);
  }

  async connect(options?: Partial<ConnectionOptions>): Promise<DeviceWrapper> {
    // Provide defaults for required fields in Nitro interface
    const connectionOptions: ConnectionOptions = {
      autoConnect: options?.autoConnect ?? false,
      requestMTU: options?.requestMTU ?? 23,
      timeout: options?.timeout ?? 0,
    };

    const result = await this.nitroDevice.connect(connectionOptions);
    return new DeviceWrapper(result);
  }

  async cancelConnection(): Promise<DeviceWrapper> {
    const result = await this.nitroDevice.cancelConnection();
    return new DeviceWrapper(result);
  }

  async isConnected(): Promise<boolean> {
    return await this.nitroDevice.isConnected();
  }

  onDisconnected(listener: (error: any | null, device: DeviceWrapper) => void): Subscription {
    return this.nitroDevice.onDisconnected((error: any, device: any) => {
      listener(error, new DeviceWrapper(device));
    });
  }

  // Service discovery
  async discoverAllServicesAndCharacteristics(transactionId?: TransactionId): Promise<DeviceWrapper> {
    const result = await this.nitroDevice.discoverAllServicesAndCharacteristics(transactionId);
    return new DeviceWrapper(result);
  }

  async services(): Promise<ServiceWrapper[]> {
    const services = await this.nitroDevice.services();
    return services.map((service: any) => new ServiceWrapper(service, this.nitroDevice));
  }

  // Characteristic operations
  async characteristicsForService(serviceUUID: UUID): Promise<CharacteristicWrapper[]> {
    const characteristics = await this.nitroDevice.characteristicsForService(serviceUUID);
    return characteristics.map((char: any) => new CharacteristicWrapper(char, this.nitroDevice));
  }

  async readCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<CharacteristicWrapper> {
    const result = await this.nitroDevice.readCharacteristicForService(
      serviceUUID, 
      characteristicUUID, 
      transactionId
    );
    return new CharacteristicWrapper(result, this.nitroDevice);
  }

  async writeCharacteristicWithResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<CharacteristicWrapper> {
    const result = await this.nitroDevice.writeCharacteristicWithResponseForService(
      serviceUUID,
      characteristicUUID,
      valueBase64,
      transactionId
    );
    return new CharacteristicWrapper(result, this.nitroDevice);
  }

  async writeCharacteristicWithoutResponseForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<CharacteristicWrapper> {
    const result = await this.nitroDevice.writeCharacteristicWithoutResponseForService(
      serviceUUID,
      characteristicUUID,
      valueBase64,
      transactionId
    );
    return new CharacteristicWrapper(result, this.nitroDevice);
  }

  monitorCharacteristicForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (error: any | null, characteristic: CharacteristicWrapper | null) => void,
    transactionId?: TransactionId,
    subscriptionType?: 'notification' | 'indication'
  ): Subscription {
    const nitroSubscriptionType = subscriptionType 
      ? normalizeCharacteristicSubscriptionType(subscriptionType)
      : undefined;

    return this.nitroDevice.monitorCharacteristicForService(
      serviceUUID,
      characteristicUUID,
      (error: any, characteristic: any) => {
        listener(
          error, 
          characteristic ? new CharacteristicWrapper(characteristic, this.nitroDevice) : null
        );
      },
      transactionId,
      nitroSubscriptionType
    );
  }

  // Descriptor operations
  async descriptorsForService(
    serviceUUID: UUID,
    characteristicUUID: UUID
  ): Promise<DescriptorWrapper[]> {
    const descriptors = await this.nitroDevice.descriptorsForService(serviceUUID, characteristicUUID);
    return descriptors.map((desc: any) => new DescriptorWrapper(desc, this.nitroDevice));
  }

  async readDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<DescriptorWrapper> {
    const result = await this.nitroDevice.readDescriptorForService(
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      transactionId
    );
    return new DescriptorWrapper(result, this.nitroDevice);
  }

  async writeDescriptorForService(
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: Base64,
    transactionId?: TransactionId
  ): Promise<DescriptorWrapper> {
    const result = await this.nitroDevice.writeDescriptorForService(
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId
    );
    return new DescriptorWrapper(result, this.nitroDevice);
  }
}

/**
 * Service wrapper for compatibility
 */
export class ServiceWrapper {
  constructor(
    private nativeService: NativeService,
    private nitroDevice: NitroDevice
  ) {}

  get id(): number {
    return this.nativeService.id;
  }

  get uuid(): UUID {
    return this.nativeService.uuid;
  }

  get deviceID(): DeviceId {
    return this.nativeService.deviceID;
  }

  get isPrimary(): boolean {
    return this.nativeService.isPrimary;
  }

  // Delegate to device methods
  async characteristics(): Promise<CharacteristicWrapper[]> {
    const device = new DeviceWrapper(this.nitroDevice);
    return await device.characteristicsForService(this.uuid);
  }

  async readCharacteristic(
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<CharacteristicWrapper> {
    const device = new DeviceWrapper(this.nitroDevice);
    return await device.readCharacteristicForService(this.uuid, characteristicUUID, transactionId);
  }

  // ... other service methods would delegate similarly
}

/**
 * Characteristic wrapper for compatibility
 */
export class CharacteristicWrapper {
  constructor(
    private nativeCharacteristic: NativeCharacteristic,
    private nitroDevice: NitroDevice
  ) {}

  get id(): number {
    return this.nativeCharacteristic.id;
  }

  get uuid(): UUID {
    return this.nativeCharacteristic.uuid;
  }

  get serviceID(): number {
    return this.nativeCharacteristic.serviceID;
  }

  get serviceUUID(): UUID {
    return this.nativeCharacteristic.serviceUUID;
  }

  get deviceID(): DeviceId {
    return this.nativeCharacteristic.deviceID;
  }

  get isReadable(): boolean {
    return this.nativeCharacteristic.isReadable;
  }

  get isWritableWithResponse(): boolean {
    return this.nativeCharacteristic.isWritableWithResponse;
  }

  get isWritableWithoutResponse(): boolean {
    return this.nativeCharacteristic.isWritableWithoutResponse;
  }

  get isNotifiable(): boolean {
    return this.nativeCharacteristic.isNotifiable;
  }

  get isNotifying(): boolean {
    return this.nativeCharacteristic.isNotifying;
  }

  get isIndicatable(): boolean {
    return this.nativeCharacteristic.isIndicatable;
  }

  get value(): Base64 | null {
    return this.nativeCharacteristic.value;
  }

  // Delegate to device methods
  async read(transactionId?: TransactionId): Promise<CharacteristicWrapper> {
    const device = new DeviceWrapper(this.nitroDevice);
    return await device.readCharacteristicForService(this.serviceUUID, this.uuid, transactionId);
  }

  // ... other characteristic methods would delegate similarly
}

/**
 * Descriptor wrapper for compatibility
 */
export class DescriptorWrapper {
  constructor(
    private nativeDescriptor: NativeDescriptor,
    private nitroDevice: NitroDevice
  ) {}

  get id(): number {
    return this.nativeDescriptor.id;
  }

  get uuid(): UUID {
    return this.nativeDescriptor.uuid;
  }

  get characteristicID(): number {
    return this.nativeDescriptor.characteristicID;
  }

  get characteristicUUID(): UUID {
    return this.nativeDescriptor.characteristicUUID;
  }

  get serviceID(): number {
    return this.nativeDescriptor.serviceID;
  }

  get serviceUUID(): UUID {
    return this.nativeDescriptor.serviceUUID;
  }

  get deviceID(): DeviceId {
    return this.nativeDescriptor.deviceID;
  }

  get value(): Base64 | null {
    return this.nativeDescriptor.value;
  }

  // Delegate to device methods
  async read(transactionId?: TransactionId): Promise<DescriptorWrapper> {
    const device = new DeviceWrapper(this.nitroDevice);
    return await device.readDescriptorForService(
      this.serviceUUID, 
      this.characteristicUUID, 
      this.uuid, 
      transactionId
    );
  }

  // ... other descriptor methods would delegate similarly
}