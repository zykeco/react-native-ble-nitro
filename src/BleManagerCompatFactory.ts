/**
 * BleManager Compatibility Factory
 * 
 * Creates BleManager instances with full react-native-ble-plx compatibility
 * by wrapping the Nitro implementation with compatibility shims
 */

import { createBleManager } from './BleManagerFactory';
import type { BleManager as BleManagerInterface } from './specs/BleManager.nitro';
import type { 
  BleManagerOptions,
  UUID,
  DeviceId,
  TransactionId,
  ConnectionPriority,
  ConnectionOptions,
  ScanOptions,
  NativeDevice,
  NativeService,
  NativeCharacteristic,
  NativeDescriptor,
  BleLogLevel,
  Subscription
} from './specs/types';
import { DeviceWrapper } from './compatibility/deviceWrapper';
import { 
  stateToString,
  logLevelToString,
  normalizeLogLevel,
  normalizeCharacteristicSubscriptionType,
  State as PlxState,
  LogLevel as PlxLogLevel
} from './compatibility/enums';


/**
 * BleManager wrapper that provides react-native-ble-plx compatibility
 */
export class BleManagerCompat {
  private bleManager: BleManagerInterface;

  constructor(options?: BleManagerOptions) {
    this.bleManager = createBleManager(options);
  }

  // Lifecycle
  async destroy(): Promise<void> {
    return await this.bleManager.destroy();
  }

  // Common operations with compatibility
  async setLogLevel(logLevel: BleLogLevel | string): Promise<PlxLogLevel> {
    const normalizedLogLevel = normalizeLogLevel(logLevel);
    const result = await this.bleManager.setLogLevel(normalizedLogLevel);
    return logLevelToString(result);
  }

  async logLevel(): Promise<PlxLogLevel> {
    const result = await this.bleManager.logLevel();
    return logLevelToString(result);
  }

  async cancelTransaction(transactionId: TransactionId): Promise<void> {
    return await this.bleManager.cancelTransaction(transactionId);
  }

  // State management with string conversion
  async enable(transactionId?: TransactionId): Promise<BleManagerCompat> {
    await this.bleManager.enable(transactionId);
    return this;
  }

  async disable(transactionId?: TransactionId): Promise<BleManagerCompat> {
    await this.bleManager.disable(transactionId);
    return this;
  }

  async state(): Promise<PlxState> {
    const result = await this.bleManager.state();
    return stateToString(result);
  }

  onStateChange(
    listener: (newState: PlxState) => void, 
    emitCurrentState?: boolean
  ): Subscription {
    return this.bleManager.onStateChange((state) => {
      listener(stateToString(state));
    }, emitCurrentState);
  }

  // Device scanning with compatibility wrappers
  async startDeviceScan(
    uuids: UUID[] | null,
    options: ScanOptions | null,
    listener: (error: any | null, scannedDevice: DeviceWrapper | null) => void // TODO: COMPAT! remove any and move to BleError as react-native-ble-plx uses this type as well!
  ): Promise<void> {
    return await this.bleManager.startDeviceScan(uuids, options, (error, device) => {
      listener(error, device ? new DeviceWrapper(this.createDeviceFromNative(device)) : null);
    });
  }

  async stopDeviceScan(): Promise<void> {
    return await this.bleManager.stopDeviceScan();
  }

  // Connection management
  async connectToDevice(
    deviceIdentifier: DeviceId,
    options?: Partial<ConnectionOptions>
  ): Promise<DeviceWrapper> {
    // Provide defaults for Nitro's required fields
    const connectionOptions: ConnectionOptions = {
      autoConnect: options?.autoConnect ?? false,
      requestMTU: options?.requestMTU ?? 23,
      timeout: options?.timeout ?? 0,
    };

    const result = await this.bleManager.connectToDevice(deviceIdentifier, connectionOptions);
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  async cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<DeviceWrapper> {
    const result = await this.bleManager.cancelDeviceConnection(deviceIdentifier);
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  async isDeviceConnected(deviceIdentifier: DeviceId): Promise<boolean> {
    return await this.bleManager.isDeviceConnected(deviceIdentifier);
  }

  onDeviceDisconnected(
    deviceIdentifier: DeviceId,
    listener: (error: any | null, device: DeviceWrapper | null) => void // TODO: COMPAT! use propper error type like in react-native-ble-plx!!!
  ): Subscription {
    return this.bleManager.onDeviceDisconnected(deviceIdentifier, (error, device) => {
      listener(error, device ? new DeviceWrapper(this.createDeviceFromNative(device)) : null);
    });
  }

  // Device discovery
  async devices(deviceIdentifiers: DeviceId[]): Promise<DeviceWrapper[]> {
    const result = await this.bleManager.devices(deviceIdentifiers);
    return result.map(device => new DeviceWrapper(this.createDeviceFromNative(device)));
  }

  async connectedDevices(serviceUUIDs: UUID[]): Promise<DeviceWrapper[]> {
    const result = await this.bleManager.connectedDevices(serviceUUIDs);
    return result.map(device => new DeviceWrapper(this.createDeviceFromNative(device)));
  }

  // RSSI and MTU operations
  async readRSSIForDevice(
    deviceIdentifier: DeviceId,
    transactionId?: TransactionId
  ): Promise<DeviceWrapper> {
    const result = await this.bleManager.readRSSIForDevice(deviceIdentifier, transactionId);
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  async requestMTUForDevice(
    deviceIdentifier: DeviceId,
    mtu: number,
    transactionId?: TransactionId
  ): Promise<DeviceWrapper> {
    const result = await this.bleManager.requestMTUForDevice(deviceIdentifier, mtu, transactionId);
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  async requestConnectionPriorityForDevice(
    deviceIdentifier: DeviceId,
    connectionPriority: ConnectionPriority,
    transactionId?: TransactionId
  ): Promise<DeviceWrapper> {
    const result = await this.bleManager.requestConnectionPriorityForDevice(
      deviceIdentifier,
      connectionPriority,
      transactionId
    );
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  // Service discovery
  async discoverAllServicesAndCharacteristicsForDevice(
    deviceIdentifier: DeviceId,
    transactionId?: TransactionId
  ): Promise<DeviceWrapper> {
    const result = await this.bleManager.discoverAllServicesAndCharacteristicsForDevice(
      deviceIdentifier,
      transactionId
    );
    return new DeviceWrapper(this.createDeviceFromNative(result));
  }

  // Service operations
  async servicesForDevice(deviceIdentifier: DeviceId): Promise<NativeService[]> {
    return await this.bleManager.servicesForDevice(deviceIdentifier);
  }

  // Characteristic operations
  async characteristicsForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID
  ): Promise<NativeCharacteristic[]> {
    return await this.bleManager.characteristicsForDevice(deviceIdentifier, serviceUUID);
  }

  async readCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic> {
    return await this.bleManager.readCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      transactionId
    );
  }

  async writeCharacteristicWithResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: string,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic> {
    return await this.bleManager.writeCharacteristicWithResponseForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      transactionId
    );
  }

  async writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: string,
    transactionId?: TransactionId
  ): Promise<NativeCharacteristic> {
    return await this.bleManager.writeCharacteristicWithoutResponseForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      base64Value,
      transactionId
    );
  }

  monitorCharacteristicForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (error: any | null, characteristic: NativeCharacteristic | null) => void, // TODO: COMPAT! use proper error type like in react-native-ble-plx
    transactionId?: TransactionId,
    subscriptionType?: 'notification' | 'indication'
  ): Subscription {
    const nitroSubscriptionType = subscriptionType 
      ? normalizeCharacteristicSubscriptionType(subscriptionType)
      : undefined;

    return this.bleManager.monitorCharacteristicForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      listener,
      transactionId,
      nitroSubscriptionType
    );
  }

  // Descriptor operations
  async descriptorsForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ): Promise<NativeDescriptor[]> {
    return await this.bleManager.descriptorsForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID
    );
  }

  async readDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor> {
    return await this.bleManager.readDescriptorForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      transactionId
    );
  }

  async writeDescriptorForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    descriptorUUID: UUID,
    valueBase64: string,
    transactionId?: TransactionId
  ): Promise<NativeDescriptor> {
    return await this.bleManager.writeDescriptorForDevice(
      deviceIdentifier,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      valueBase64,
      transactionId
    );
  }

  /**
   * Helper method to create a Device wrapper from NativeDevice data
   * This is a temporary method until we have proper Device Nitro objects
   */
  private createDeviceFromNative(nativeDevice: NativeDevice) {
    // This is a placeholder - in the actual implementation, we'd need to create
    // proper Nitro Device objects, but for now we'll work with the native data
    return {
      id: nativeDevice.id,
      deviceName: nativeDevice.name,
      rssi: nativeDevice.rssi,
      mtu: nativeDevice.mtu,
      manufacturerData: nativeDevice.manufacturerData,
      rawScanRecord: nativeDevice.rawScanRecord,
      serviceData: nativeDevice.serviceData,
      serviceUUIDs: nativeDevice.serviceUUIDs,
      localName: nativeDevice.localName,
      txPowerLevel: nativeDevice.txPowerLevel,
      solicitedServiceUUIDs: nativeDevice.solicitedServiceUUIDs,
      isConnectable: nativeDevice.isConnectable,
      overflowServiceUUIDs: nativeDevice.overflowServiceUUIDs,
      // Add placeholder methods - these would be implemented in the actual Device class
      requestConnectionPriority: async () => this.createDeviceFromNative(nativeDevice),
      readRSSI: async () => this.createDeviceFromNative(nativeDevice),
      requestMTU: async () => this.createDeviceFromNative(nativeDevice),
      connect: async () => this.createDeviceFromNative(nativeDevice),
      cancelConnection: async () => this.createDeviceFromNative(nativeDevice),
      isConnected: async () => false,
      onDisconnected: () => ({ remove: () => {} }),
      discoverAllServicesAndCharacteristics: async () => this.createDeviceFromNative(nativeDevice),
      services: async () => [],
      characteristicsForService: async () => [],
      readCharacteristicForService: async () => ({}),
      writeCharacteristicWithResponseForService: async () => ({}),
      writeCharacteristicWithoutResponseForService: async () => ({}),
      monitorCharacteristicForService: () => ({ remove: () => {} }),
      descriptorsForService: async () => [],
      readDescriptorForService: async () => ({}),
      writeDescriptorForService: async () => ({}),
    };
  }
}

/**
 * Factory function to create a compatibility BleManager
 */
export function createBleManagerCompat(options?: BleManagerOptions): BleManagerCompat {
  return new BleManagerCompat(options);
}