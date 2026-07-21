import {
  AndroidGattServerAdvertiseMode as NativeAndroidGattServerAdvertiseMode,
  AndroidGattServerAdvertiseTxPowerLevel as NativeAndroidGattServerAdvertiseTxPowerLevel,
  NativeGattCharacteristicPermission,
  NativeGattCharacteristicProperty,
  NativeGattServerEventType,
  type GattServerEvent as NativeGattServerEvent,
  type GattServerOptions as NativeGattServerOptions,
} from './specs/NativeBleNitro';
import {
  arrayBufferToByteArray,
  byteArrayToArrayBuffer,
  type ByteArray,
} from './types';

export enum GattCharacteristicProperty {
  Broadcast = 'Broadcast',
  Read = 'Read',
  WriteWithoutResponse = 'WriteWithoutResponse',
  Write = 'Write',
  Notify = 'Notify',
  Indicate = 'Indicate',
  AuthenticatedSignedWrites = 'AuthenticatedSignedWrites',
}

export enum GattCharacteristicPermission {
  Read = 'Read',
  Write = 'Write',
  ReadEncrypted = 'ReadEncrypted',
  ReadEncryptedMITM = 'ReadEncryptedMITM',
  WriteEncrypted = 'WriteEncrypted',
  WriteEncryptedMITM = 'WriteEncryptedMITM',
  WriteSigned = 'WriteSigned',
  WriteSignedMITM = 'WriteSignedMITM',
}

export enum GattServerAdvertiseMode {
  LowPower = 'LowPower',
  Balanced = 'Balanced',
  LowLatency = 'LowLatency',
}

export enum GattServerAdvertiseTxPowerLevel {
  UltraLow = 'UltraLow',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export type GattServerEventType =
  | 'advertisingStarted'
  | 'advertisingStopped'
  | 'deviceConnected'
  | 'deviceDisconnected'
  | 'characteristicRead'
  | 'characteristicWrite'
  | 'notificationSubscribed'
  | 'notificationUnsubscribed'
  | 'error'
  | 'mtuChanged';

export interface GattServerCharacteristic {
  uuid: string;
  properties: GattCharacteristicProperty[];
  permissions?: GattCharacteristicPermission[];
  value?: ByteArray;
  onRead?: GattServerCharacteristicReadCallback;
  onWrite?: GattServerCharacteristicWriteCallback;
  onSubscribe?: GattServerSubscriptionCallback;
  onUnsubscribe?: GattServerSubscriptionCallback;
}

export interface GattServerService {
  uuid: string;
  primary?: boolean;
  characteristics: GattServerCharacteristic[];
}

export interface GattServerAndroidAdvertisingOptions {
  mode?: GattServerAdvertiseMode;
  txPowerLevel?: GattServerAdvertiseTxPowerLevel;
  includeTxPowerLevel?: boolean;
  connectable?: boolean;
}

export interface GattServerAdvertisingOptions {
  serviceUUIDs?: string[];
  /**
   * Advertised local name. Omit it to leave the name out of the advertisement.
   * Android temporarily applies an explicit name to the system Bluetooth
   * adapter while the server is running and restores it on stop.
   */
  localName?: string;
  /**
   * Android only: include the device name in the scan response. Defaults to
   * true when `localName` is provided and false otherwise.
   */
  includeDeviceName?: boolean;
  android?: GattServerAndroidAdvertisingOptions;
}

export interface GattServerOptions {
  services: GattServerService[];
  advertising?: GattServerAdvertisingOptions | false;
  onAdvertisingStarted?: GattServerAdvertisingCallback;
  onAdvertisingStopped?: GattServerAdvertisingCallback;
  /**
   * Android: emitted for an actual connection. iOS: emitted when CoreBluetooth
   * first exposes a central through a read, write, or subscription request.
   */
  onDeviceConnected?: GattServerDeviceCallback;
  /**
   * Android: emitted for an actual disconnection. iOS: emitted only when a
   * central removes its final notification subscription.
   */
  onDeviceDisconnected?: GattServerDeviceCallback;
  onMtuChanged?: GattServerMtuCallback;
  onError?: GattServerErrorCallback;
}

export interface GattServerEvent {
  type: GattServerEventType;
  deviceId?: string;
  serviceId?: string;
  characteristicId?: string;
  descriptorId?: string;
  data?: ByteArray;
  isSubscribed?: boolean;
  mtu?: number;
  error?: string;
}

export type GattServerAdvertisingCallback = () => void;

export interface GattServerDeviceEvent {
  deviceId: string;
  mtu?: number;
}

export type GattServerDeviceCallback = (event: GattServerDeviceEvent) => void;

export interface GattServerCharacteristicReadEvent {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  mtu?: number;
}

export type GattServerCharacteristicReadCallback = (
  event: GattServerCharacteristicReadEvent
) => void;

export interface GattServerCharacteristicWriteEvent {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  data: ByteArray;
  mtu?: number;
}

export type GattServerCharacteristicWriteCallback = (
  event: GattServerCharacteristicWriteEvent
) => void;

export interface GattServerSubscriptionEvent {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  descriptorId?: string;
  mtu?: number;
}

export type GattServerSubscriptionCallback = (
  event: GattServerSubscriptionEvent
) => void;

export interface GattServerNotificationOptions {
  /** Notify only this central. Omit to notify every subscribed central. */
  deviceId?: string;
}

export interface GattServerNotificationResult {
  /** Centrals for which the native peripheral queue accepted the update. */
  queuedDeviceIds: string[];
}

export interface GattServerMtuEvent {
  deviceId: string;
  mtu: number;
}

export type GattServerMtuCallback = (event: GattServerMtuEvent) => void;

export interface GattServerErrorEvent {
  deviceId?: string;
  serviceId?: string;
  characteristicId?: string;
  descriptorId?: string;
  message: string;
}

export type GattServerErrorCallback = (event: GattServerErrorEvent) => void;

export function mapGattCharacteristicPropertyToNative(
  property: GattCharacteristicProperty
): NativeGattCharacteristicProperty {
  const map = {
    Broadcast: NativeGattCharacteristicProperty.Broadcast,
    Read: NativeGattCharacteristicProperty.Read,
    WriteWithoutResponse: NativeGattCharacteristicProperty.WriteWithoutResponse,
    Write: NativeGattCharacteristicProperty.Write,
    Notify: NativeGattCharacteristicProperty.Notify,
    Indicate: NativeGattCharacteristicProperty.Indicate,
    AuthenticatedSignedWrites: NativeGattCharacteristicProperty.AuthenticatedSignedWrites,
  };
  return map[property];
}

export function mapGattCharacteristicPermissionToNative(
  permission: GattCharacteristicPermission
): NativeGattCharacteristicPermission {
  const map = {
    Read: NativeGattCharacteristicPermission.Read,
    Write: NativeGattCharacteristicPermission.Write,
    ReadEncrypted: NativeGattCharacteristicPermission.ReadEncrypted,
    ReadEncryptedMITM: NativeGattCharacteristicPermission.ReadEncryptedMITM,
    WriteEncrypted: NativeGattCharacteristicPermission.WriteEncrypted,
    WriteEncryptedMITM: NativeGattCharacteristicPermission.WriteEncryptedMITM,
    WriteSigned: NativeGattCharacteristicPermission.WriteSigned,
    WriteSignedMITM: NativeGattCharacteristicPermission.WriteSignedMITM,
  };
  return map[permission];
}

export function mapGattServerAdvertiseModeToNative(
  mode: GattServerAdvertiseMode
): NativeAndroidGattServerAdvertiseMode {
  const map = {
    LowPower: NativeAndroidGattServerAdvertiseMode.LowPower,
    Balanced: NativeAndroidGattServerAdvertiseMode.Balanced,
    LowLatency: NativeAndroidGattServerAdvertiseMode.LowLatency,
  };
  return map[mode];
}

export function mapGattServerAdvertiseTxPowerLevelToNative(
  txPowerLevel: GattServerAdvertiseTxPowerLevel
): NativeAndroidGattServerAdvertiseTxPowerLevel {
  const map = {
    UltraLow: NativeAndroidGattServerAdvertiseTxPowerLevel.UltraLow,
    Low: NativeAndroidGattServerAdvertiseTxPowerLevel.Low,
    Medium: NativeAndroidGattServerAdvertiseTxPowerLevel.Medium,
    High: NativeAndroidGattServerAdvertiseTxPowerLevel.High,
  };
  return map[txPowerLevel];
}

export function gattFlags<T>(
  values: T[],
  mapper: (value: T) => number
): number {
  return values.reduce((flags, value) => flags | mapper(value), 0);
}

export function defaultGattPermissionsForProperties(
  properties: GattCharacteristicProperty[]
): GattCharacteristicPermission[] {
  const permissions: GattCharacteristicPermission[] = [];
  if (properties.includes(GattCharacteristicProperty.Read)) {
    permissions.push(GattCharacteristicPermission.Read);
  }
  if (
    properties.includes(GattCharacteristicProperty.Write) ||
    properties.includes(GattCharacteristicProperty.WriteWithoutResponse)
  ) {
    permissions.push(GattCharacteristicPermission.Write);
  }
  return permissions;
}

type NormalizeUuid = (uuid: string) => string;

export function createNativeGattServerOptions(
  options: GattServerOptions,
  normalizeUuid: NormalizeUuid
): NativeGattServerOptions {
  if (!options.services.length) {
    throw new Error('At least one GATT service is required');
  }

  return {
    services: options.services.map((service) => ({
      uuid: normalizeUuid(service.uuid),
      primary: service.primary ?? true,
      characteristics: service.characteristics.map((characteristic) => {
        if (!characteristic.properties.length) {
          throw new Error(
            `Characteristic ${characteristic.uuid} requires at least one property`
          );
        }
        if (
          characteristic.properties.includes(GattCharacteristicProperty.Notify) &&
          characteristic.properties.includes(GattCharacteristicProperty.Indicate)
        ) {
          throw new Error(
            `Characteristic ${characteristic.uuid} cannot use Notify and Indicate together`
          );
        }

        const permissions =
          characteristic.permissions ??
          defaultGattPermissionsForProperties(characteristic.properties);

        return {
          uuid: normalizeUuid(characteristic.uuid),
          properties: gattFlags(
            characteristic.properties,
            mapGattCharacteristicPropertyToNative
          ),
          permissions: gattFlags(
            permissions,
            mapGattCharacteristicPermissionToNative
          ),
          value: byteArrayToArrayBuffer(characteristic.value ?? []),
        };
      }),
    })),
    advertising: createNativeAdvertisingOptions(options, normalizeUuid),
  };
}

function createNativeAdvertisingOptions(
  options: GattServerOptions,
  normalizeUuid: NormalizeUuid
): NativeGattServerOptions['advertising'] {
  if (options.advertising === false) {
    return {
      enabled: false,
      serviceUUIDs: [],
      localName: '',
      includeDeviceName: false,
      includeTxPowerLevel: false,
      androidAdvertiseMode: mapGattServerAdvertiseModeToNative(
        GattServerAdvertiseMode.Balanced
      ),
      androidTxPowerLevel: mapGattServerAdvertiseTxPowerLevelToNative(
        GattServerAdvertiseTxPowerLevel.Medium
      ),
      androidConnectable: true,
    };
  }

  const advertising = options.advertising;
  const android = advertising?.android;
  const localName = advertising?.localName ?? '';

  return {
    enabled: true,
    serviceUUIDs: (advertising?.serviceUUIDs ?? []).map(normalizeUuid),
    localName,
    includeDeviceName:
      advertising?.includeDeviceName ?? localName.length > 0,
    includeTxPowerLevel: android?.includeTxPowerLevel ?? false,
    androidAdvertiseMode: mapGattServerAdvertiseModeToNative(
      android?.mode ?? GattServerAdvertiseMode.Balanced
    ),
    androidTxPowerLevel: mapGattServerAdvertiseTxPowerLevelToNative(
      android?.txPowerLevel ?? GattServerAdvertiseTxPowerLevel.Medium
    ),
    androidConnectable: android?.connectable ?? true,
  };
}

export function convertNativeGattServerEvent(
  event: NativeGattServerEvent,
  normalizeUuid: NormalizeUuid
): GattServerEvent {
  const eventTypes: Record<NativeGattServerEventType, GattServerEventType> = {
    [NativeGattServerEventType.AdvertisingStarted]: 'advertisingStarted',
    [NativeGattServerEventType.AdvertisingStopped]: 'advertisingStopped',
    [NativeGattServerEventType.DeviceConnected]: 'deviceConnected',
    [NativeGattServerEventType.DeviceDisconnected]: 'deviceDisconnected',
    [NativeGattServerEventType.CharacteristicRead]: 'characteristicRead',
    [NativeGattServerEventType.CharacteristicWrite]: 'characteristicWrite',
    [NativeGattServerEventType.NotificationSubscribed]: 'notificationSubscribed',
    [NativeGattServerEventType.NotificationUnsubscribed]: 'notificationUnsubscribed',
    [NativeGattServerEventType.Error]: 'error',
    [NativeGattServerEventType.MtuChanged]: 'mtuChanged',
  };

  return {
    type: eventTypes[event.type],
    deviceId: event.deviceId || undefined,
    serviceId: event.serviceId ? normalizeUuid(event.serviceId) : undefined,
    characteristicId: event.characteristicId
      ? normalizeUuid(event.characteristicId)
      : undefined,
    descriptorId: event.descriptorId
      ? normalizeUuid(event.descriptorId)
      : undefined,
    data: arrayBufferToByteArray(event.data),
    isSubscribed: event.isSubscribed,
    mtu: event.mtu > 0 ? event.mtu : undefined,
    error: event.error || undefined,
  };
}

export function dispatchGattServerEvent(
  options: GattServerOptions,
  event: GattServerEvent,
  normalizeUuid: NormalizeUuid
): void {
  const characteristic = findCharacteristic(options, event, normalizeUuid);
  const deviceId = event.deviceId ?? '';
  const serviceId = event.serviceId ?? '';
  const characteristicId = event.characteristicId ?? '';
  const mtu = event.mtu === undefined ? {} : { mtu: event.mtu };

  switch (event.type) {
    case 'advertisingStarted':
      options.onAdvertisingStarted?.();
      break;
    case 'advertisingStopped':
      options.onAdvertisingStopped?.();
      break;
    case 'deviceConnected':
      options.onDeviceConnected?.({ deviceId, ...mtu });
      break;
    case 'deviceDisconnected':
      options.onDeviceDisconnected?.({ deviceId, ...mtu });
      break;
    case 'characteristicRead':
      characteristic?.onRead?.({ deviceId, serviceId, characteristicId, ...mtu });
      break;
    case 'characteristicWrite':
      characteristic?.onWrite?.({
        deviceId,
        serviceId,
        characteristicId,
        data: event.data ?? [],
        ...mtu,
      });
      break;
    case 'notificationSubscribed':
      characteristic?.onSubscribe?.({
        deviceId,
        serviceId,
        characteristicId,
        descriptorId: event.descriptorId,
        ...mtu,
      });
      break;
    case 'notificationUnsubscribed':
      characteristic?.onUnsubscribe?.({
        deviceId,
        serviceId,
        characteristicId,
        descriptorId: event.descriptorId,
        ...mtu,
      });
      break;
    case 'error':
      options.onError?.({
        deviceId: event.deviceId,
        serviceId: event.serviceId,
        characteristicId: event.characteristicId,
        descriptorId: event.descriptorId,
        message: event.error ?? 'Unknown GATT server error',
      });
      break;
    case 'mtuChanged':
      options.onMtuChanged?.({ deviceId, mtu: event.mtu ?? 0 });
      break;
  }
}

function findCharacteristic(
  options: GattServerOptions,
  event: GattServerEvent,
  normalizeUuid: NormalizeUuid
): GattServerCharacteristic | undefined {
  if (!event.serviceId || !event.characteristicId) {
    return undefined;
  }

  const service = options.services.find(
    (candidate) => normalizeUuid(candidate.uuid) === event.serviceId
  );
  return service?.characteristics.find(
    (candidate) => normalizeUuid(candidate.uuid) === event.characteristicId
  );
}
