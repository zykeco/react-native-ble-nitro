import {
  GattCharacteristicPermission,
  GattCharacteristicProperty,
  type ByteArray,
  type GattServerCharacteristic,
  type GattServerOptions,
} from 'react-native-ble-nitro';

export const GATT_SERVER_UUIDS = {
  // Random UUIDv4 values generated once and kept stable for interoperability.
  service: '1fda23b8-f352-4330-ad1d-86f743da9e61',
  signal: 'ab239642-8c7c-4238-b2aa-453d7abf0720',
  write: '00d94ded-ac04-4d52-86e3-4e2a862cb42b',
} as const;

export const GATT_SERVER_LOCAL_NAME = 'BLE Nitro';

export type GattServerSignalMode = 'notify' | 'indicate';
export type GattServerWriteMode = 'write' | 'writeWithoutResponse';

export interface GattServerModes {
  signalMode: GattServerSignalMode;
  writeMode: GattServerWriteMode;
}

export type GattServerModeOverrides = Partial<GattServerModes>;

type LifecycleHandlerName =
  | 'onAdvertisingStarted'
  | 'onAdvertisingStopped'
  | 'onDeviceConnected'
  | 'onDeviceDisconnected'
  | 'onMtuChanged'
  | 'onError';

type CharacteristicHandlerName =
  | 'onRead'
  | 'onWrite'
  | 'onSubscribe'
  | 'onUnsubscribe';

export type GattServerExampleHandlers = Pick<
  GattServerOptions,
  LifecycleHandlerName
> &
  Pick<GattServerCharacteristic, CharacteristicHandlerName>;

export interface CreateGattServerOptions extends GattServerModes {
  initialValue: ByteArray;
  handlers?: GattServerExampleHandlers;
}

export function createGattServerOptions({
  signalMode,
  writeMode,
  initialValue,
  handlers = {},
}: CreateGattServerOptions): GattServerOptions {
  const signalProperty =
    signalMode === 'indicate'
      ? GattCharacteristicProperty.Indicate
      : GattCharacteristicProperty.Notify;
  const writeProperty =
    writeMode === 'writeWithoutResponse'
      ? GattCharacteristicProperty.WriteWithoutResponse
      : GattCharacteristicProperty.Write;

  return {
    advertising: {
      localName: GATT_SERVER_LOCAL_NAME,
      serviceUUIDs: [GATT_SERVER_UUIDS.service],
    },
    services: [
      {
        uuid: GATT_SERVER_UUIDS.service,
        characteristics: [
          {
            uuid: GATT_SERVER_UUIDS.signal,
            properties: [GattCharacteristicProperty.Read, signalProperty],
            permissions: [GattCharacteristicPermission.Read],
            value: initialValue,
            onRead: handlers.onRead,
            onSubscribe: handlers.onSubscribe,
            onUnsubscribe: handlers.onUnsubscribe,
          },
          {
            uuid: GATT_SERVER_UUIDS.write,
            properties: [writeProperty],
            permissions: [GattCharacteristicPermission.Write],
            value: [],
            onWrite: handlers.onWrite,
          },
        ],
      },
    ],
    onAdvertisingStarted: handlers.onAdvertisingStarted,
    onAdvertisingStopped: handlers.onAdvertisingStopped,
    onDeviceConnected: handlers.onDeviceConnected,
    onDeviceDisconnected: handlers.onDeviceDisconnected,
    onMtuChanged: handlers.onMtuChanged,
    onError: handlers.onError,
  };
}

/** Converts a simple one-byte-per-character test payload. */
export function textToGattBytes(text: string): ByteArray {
  return Array.from(text, (character) => character.charCodeAt(0) & 0xff);
}

/** Decodes the one-byte-per-character test payload used by this example. */
export function gattBytesToText(data: ByteArray): string {
  return data.map((byte) => String.fromCharCode(byte)).join('');
}
