const mockNativeInstance = {
  startGattServer: jest.fn(),
  stopGattServer: jest.fn(),
  isGattServerRunning: jest.fn(),
  isGattServerAdvertising: jest.fn(),
  getGattServerConnectedDevices: jest.fn(),
  getGattServerDeviceMTU: jest.fn(),
  setGattServerCharacteristicValue: jest.fn(),
  notifyGattServerCharacteristicChanged: jest.fn(),
  disconnectGattServerDevice: jest.fn(),
};

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 35 },
  PermissionsAndroid: {
    PERMISSIONS: {},
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    check: jest.fn(),
    requestMultiple: jest.fn(),
  },
}));

jest.mock('../specs/NativeBleNitro', () => ({
  __esModule: true,
  default: mockNativeInstance,
  NativeGattCharacteristicProperty: {
    Broadcast: 1,
    Read: 2,
    WriteWithoutResponse: 4,
    Write: 8,
    Notify: 16,
    Indicate: 32,
    AuthenticatedSignedWrites: 64,
  },
  NativeGattCharacteristicPermission: {
    Read: 1,
    Write: 2,
    ReadEncrypted: 4,
    ReadEncryptedMITM: 8,
    WriteEncrypted: 16,
    WriteEncryptedMITM: 32,
    WriteSigned: 64,
    WriteSignedMITM: 128,
  },
  NativeGattServerEventType: {
    AdvertisingStarted: 0,
    AdvertisingStopped: 1,
    DeviceConnected: 2,
    DeviceDisconnected: 3,
    CharacteristicRead: 4,
    CharacteristicWrite: 5,
    NotificationSubscribed: 6,
    NotificationUnsubscribed: 7,
    Error: 8,
    MtuChanged: 9,
  },
  AndroidGattServerAdvertiseMode: {
    LowPower: 0,
    Balanced: 1,
    LowLatency: 2,
  },
  AndroidGattServerAdvertiseTxPowerLevel: {
    UltraLow: 0,
    Low: 1,
    Medium: 2,
    High: 3,
  },
}));

jest.mock('../specs/NativeBleNitroFactory', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockNativeInstance),
  },
}));

import {
  BleNitro,
  GattCharacteristicPermission,
  GattCharacteristicProperty,
  GattServerAdvertiseMode,
  GattServerAdvertiseTxPowerLevel,
  type GattServerOptions,
} from '../index';

const mockNative = mockNativeInstance;
const BleManager = BleNitro.instance();

describe('BleNitro GATT server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  type MockGattServerEvent = {
    type: number;
    deviceId: string;
    serviceId: string;
    characteristicId: string;
    descriptorId: string;
    data: ArrayBuffer;
    isSubscribed: boolean;
    mtu: number;
    error: string;
  };

  const nativeGattServerEvent = (
    event: Partial<MockGattServerEvent> = {}
  ): MockGattServerEvent => ({
    type: 0,
    deviceId: '',
    serviceId: '',
    characteristicId: '',
    descriptorId: '',
    data: new Uint8Array([]).buffer,
    isSubscribed: false,
    mtu: 0,
    error: '',
    ...event,
  });

  const minimalGattServerOptions = (
    overrides: Partial<GattServerOptions> = {}
  ): GattServerOptions => ({
    services: [
      {
        uuid: '180f',
        characteristics: [
          {
            uuid: '2a19',
            properties: [GattCharacteristicProperty.Read],
            value: [80],
          },
        ],
      },
    ],
    ...overrides,
  });

  test('startGattServer rejects invalid service definitions before calling native', async () => {
    await expect(
      BleManager.startGattServer({ services: [] })
    ).rejects.toThrow('At least one GATT service is required');

    expect(mockNative.startGattServer).not.toHaveBeenCalled();

    await expect(
      BleManager.startGattServer({
        services: [
          {
            uuid: '180f',
            characteristics: [
              {
                uuid: '2a19',
                properties: [],
              },
            ],
          },
        ],
      })
    ).rejects.toThrow('Characteristic 2a19 requires at least one property');

    expect(mockNative.startGattServer).not.toHaveBeenCalled();

    await expect(
      BleManager.startGattServer({
        services: [
          {
            uuid: '180f',
            characteristics: [
              {
                uuid: '2a19',
                properties: [
                  GattCharacteristicProperty.Notify,
                  GattCharacteristicProperty.Indicate,
                ],
              },
            ],
          },
        ],
      })
    ).rejects.toThrow('cannot use Notify and Indicate together');
  });

  test('startGattServer maps disabled advertising', async () => {
    mockNative.startGattServer.mockImplementation((_options, _eventCallback, callback) => {
      callback(true, '');
    });

    await BleManager.startGattServer(
      minimalGattServerOptions({
        advertising: false,
      })
    );

    expect(mockNative.startGattServer).toHaveBeenCalledWith(
      expect.objectContaining({
        advertising: {
          enabled: false,
          serviceUUIDs: [],
          localName: '',
          includeDeviceName: false,
          includeTxPowerLevel: false,
          androidAdvertiseMode: 1,
          androidTxPowerLevel: 2,
          androidConnectable: true,
        },
      }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('startGattServer maps services and dispatches targeted callbacks', async () => {
    mockNative.startGattServer.mockImplementation((_options, eventCallback, callback) => {
      eventCallback({
        type: 0,
        deviceId: '',
        serviceId: '',
        characteristicId: '',
        descriptorId: '',
        data: new Uint8Array([]).buffer,
        isSubscribed: false,
        error: '',
      });
      eventCallback({
        type: 2,
        deviceId: 'device-server',
        serviceId: '',
        characteristicId: '',
        descriptorId: '',
        data: new Uint8Array([]).buffer,
        isSubscribed: false,
        error: '',
      });
      eventCallback({
        type: 5,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
        descriptorId: '',
        data: new Uint8Array([0x2a]).buffer,
        isSubscribed: false,
        error: '',
      });
      callback(true, '');
    });

    const onAdvertisingStarted = jest.fn();
    const onDeviceConnected = jest.fn();
    const onWrite = jest.fn();
    await BleManager.startGattServer({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [
                GattCharacteristicProperty.Read,
                GattCharacteristicProperty.Notify,
              ],
              value: [80],
              onWrite,
            },
          ],
        },
      ],
      advertising: {
        localName: 'Ble Nitro Test',
        serviceUUIDs: ['180f'],
        android: {
          mode: GattServerAdvertiseMode.LowLatency,
          txPowerLevel: GattServerAdvertiseTxPowerLevel.High,
          includeTxPowerLevel: true,
          connectable: false,
        },
      },
      onAdvertisingStarted,
      onDeviceConnected,
    });

    expect(mockNative.startGattServer).toHaveBeenCalledWith(
      {
        services: [
          {
            uuid: '0000180f-0000-1000-8000-00805f9b34fb',
            primary: true,
            characteristics: [
              {
                uuid: '00002a19-0000-1000-8000-00805f9b34fb',
                properties: 18,
                permissions: 1,
                value: expect.any(ArrayBuffer),
              },
            ],
          },
        ],
        advertising: {
          enabled: true,
          serviceUUIDs: ['0000180f-0000-1000-8000-00805f9b34fb'],
          localName: 'Ble Nitro Test',
          includeDeviceName: true,
          includeTxPowerLevel: true,
          androidAdvertiseMode: 2,
          androidTxPowerLevel: 3,
          androidConnectable: false,
        },
      },
      expect.any(Function),
      expect.any(Function)
    );
    expect(onAdvertisingStarted).toHaveBeenCalledTimes(1);
    expect(onDeviceConnected).toHaveBeenCalledWith({
      deviceId: 'device-server',
    });
    expect(onWrite).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      data: [0x2a],
    });
  });

  test('startGattServer uses minimal advertising defaults', async () => {
    mockNative.startGattServer.mockImplementation((_options, _eventCallback, callback) => {
      callback(true, '');
    });

    await BleManager.startGattServer({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [GattCharacteristicProperty.Read],
              value: [80],
            },
          ],
        },
      ],
    });

    expect(mockNative.startGattServer).toHaveBeenCalledWith(
      expect.objectContaining({
        advertising: {
          enabled: true,
          serviceUUIDs: [],
          localName: '',
          includeDeviceName: false,
          includeTxPowerLevel: false,
          androidAdvertiseMode: 1,
          androidTxPowerLevel: 2,
          androidConnectable: true,
        },
      }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('startGattServer maps signed and encrypted GATT permissions', async () => {
    mockNative.startGattServer.mockImplementation((_options, _eventCallback, callback) => {
      callback(true, '');
    });

    await BleManager.startGattServer({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [
                GattCharacteristicProperty.Read,
                GattCharacteristicProperty.AuthenticatedSignedWrites,
              ],
              permissions: [
                GattCharacteristicPermission.ReadEncrypted,
                GattCharacteristicPermission.ReadEncryptedMITM,
                GattCharacteristicPermission.WriteEncrypted,
                GattCharacteristicPermission.WriteEncryptedMITM,
                GattCharacteristicPermission.WriteSigned,
                GattCharacteristicPermission.WriteSignedMITM,
              ],
              value: [80],
            },
          ],
        },
      ],
      advertising: false,
    });

    expect(mockNative.startGattServer).toHaveBeenCalledWith(
      expect.objectContaining({
        services: [
          {
            uuid: '0000180f-0000-1000-8000-00805f9b34fb',
            primary: true,
            characteristics: [
              {
                uuid: '00002a19-0000-1000-8000-00805f9b34fb',
                properties: 66,
                permissions: 252,
                value: expect.any(ArrayBuffer),
              },
            ],
          },
        ],
      }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('startGattServer dispatches read, subscription, disconnect, stop, and error events', async () => {
    mockNative.startGattServer.mockImplementation((_options, eventCallback, callback) => {
      eventCallback(nativeGattServerEvent({ type: 1 }));
      eventCallback(nativeGattServerEvent({
        type: 3,
        deviceId: 'device-server',
      }));
      eventCallback(nativeGattServerEvent({
        type: 4,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
      }));
      eventCallback(nativeGattServerEvent({
        type: 6,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
        descriptorId: '2902',
        isSubscribed: true,
      }));
      eventCallback(nativeGattServerEvent({
        type: 7,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
        descriptorId: '2902',
        isSubscribed: false,
      }));
      eventCallback(nativeGattServerEvent({
        type: 8,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
        descriptorId: '2902',
        error: 'server exploded',
      }));
      callback(true, '');
    });

    const onAdvertisingStopped = jest.fn();
    const onDeviceDisconnected = jest.fn();
    const onRead = jest.fn();
    const onSubscribe = jest.fn();
    const onUnsubscribe = jest.fn();
    const onError = jest.fn();

    await BleManager.startGattServer({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [
                GattCharacteristicProperty.Read,
                GattCharacteristicProperty.Notify,
              ],
              onRead,
              onSubscribe,
              onUnsubscribe,
            },
          ],
        },
      ],
      onAdvertisingStopped,
      onDeviceDisconnected,
      onError,
    });

    expect(onAdvertisingStopped).toHaveBeenCalledTimes(1);
    expect(onDeviceDisconnected).toHaveBeenCalledWith({
      deviceId: 'device-server',
    });
    expect(onRead).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
    });
    expect(onSubscribe).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      descriptorId: '00002902-0000-1000-8000-00805f9b34fb',
    });
    expect(onUnsubscribe).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      descriptorId: '00002902-0000-1000-8000-00805f9b34fb',
    });
    expect(onError).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      descriptorId: '00002902-0000-1000-8000-00805f9b34fb',
      message: 'server exploded',
    });
  });

  test('startGattServer exposes mtu on server events and getter', async () => {
    mockNative.startGattServer.mockImplementation((_options, eventCallback, callback) => {
      eventCallback(nativeGattServerEvent({
        type: 9,
        deviceId: 'device-server',
        mtu: 247,
      }));
      eventCallback(nativeGattServerEvent({
        type: 4,
        deviceId: 'device-server',
        serviceId: '180f',
        characteristicId: '2a19',
        mtu: 247,
      }));
      callback(true, '');
    });
    mockNative.getGattServerDeviceMTU.mockReturnValueOnce(247);

    const onMtuChanged = jest.fn();
    const onRead = jest.fn();

    await BleManager.startGattServer({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [GattCharacteristicProperty.Read],
              onRead,
            },
          ],
        },
      ],
      onMtuChanged,
    });

    expect(onMtuChanged).toHaveBeenCalledWith({
      deviceId: 'device-server',
      mtu: 247,
    });
    expect(onRead).toHaveBeenCalledWith({
      deviceId: 'device-server',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      mtu: 247,
    });
    expect(BleManager.getGattServerDeviceMTU('device-server')).toBe(247);
    expect(mockNative.getGattServerDeviceMTU).toHaveBeenCalledWith('device-server');
  });

  test('startGattServer rejects when native start fails', async () => {
    mockNative.startGattServer.mockImplementation((_options, _eventCallback, callback) => {
      callback(false, 'Advertise failed');
    });

    await expect(
      BleManager.startGattServer(minimalGattServerOptions())
    ).rejects.toThrow('Advertise failed');
  });

  test('startGattServer settles a pending start when it is replaced or stopped', async () => {
    const startCallbacks: Array<(success: boolean, error: string) => void> = [];
    mockNative.startGattServer.mockImplementation((_options, _eventCallback, callback) => {
      startCallbacks.push(callback);
    });
    mockNative.stopGattServer.mockImplementation((callback) => {
      callback(true, '');
    });

    const firstStart = BleManager.startGattServer(minimalGattServerOptions());
    const replacementStart = BleManager.startGattServer(minimalGattServerOptions());

    await expect(firstStart).rejects.toThrow('superseded');
    startCallbacks[1](true, '');
    await expect(replacementStart).resolves.toBeUndefined();

    const pendingStart = BleManager.startGattServer(minimalGattServerOptions());
    await BleManager.stopGattServer();
    await expect(pendingStart).rejects.toThrow('was stopped');
  });

  test('startGattServer ignores events from a superseded server callback', async () => {
    const eventCallbacks: Array<(event: MockGattServerEvent) => void> = [];
    mockNative.startGattServer.mockImplementation((_options, eventCallback, callback) => {
      eventCallbacks.push(eventCallback);
      callback(true, '');
    });

    const firstOnWrite = jest.fn();
    const secondOnWrite = jest.fn();
    const options = (onWrite: jest.Mock) => ({
      services: [
        {
          uuid: '180f',
          characteristics: [
            {
              uuid: '2a19',
              properties: [GattCharacteristicProperty.Write],
              onWrite,
            },
          ],
        },
      ],
    });

    await BleManager.startGattServer(options(firstOnWrite));
    await BleManager.startGattServer(options(secondOnWrite));

    eventCallbacks[0](nativeGattServerEvent({
      type: 5,
      deviceId: 'old-device',
      serviceId: '180f',
      characteristicId: '2a19',
      data: new Uint8Array([0x01]).buffer,
    }));
    eventCallbacks[1](nativeGattServerEvent({
      type: 5,
      deviceId: 'new-device',
      serviceId: '180f',
      characteristicId: '2a19',
      data: new Uint8Array([0x02]).buffer,
    }));

    expect(firstOnWrite).not.toHaveBeenCalled();
    expect(secondOnWrite).toHaveBeenCalledTimes(1);
    expect(secondOnWrite).toHaveBeenCalledWith({
      deviceId: 'new-device',
      serviceId: '0000180f-0000-1000-8000-00805f9b34fb',
      characteristicId: '00002a19-0000-1000-8000-00805f9b34fb',
      data: [0x02],
    });
  });

  test('notifyGattServerCharacteristicChanged normalizes UUIDs and data', async () => {
    mockNative.notifyGattServerCharacteristicChanged.mockImplementation((_deviceId, _serviceId, _charId, _data, callback) => {
      callback(true, ['device-server'], '');
    });

    await expect(BleManager.notifyGattServerCharacteristicChanged(
      '180f',
      '2a19',
      [90],
      { deviceId: 'device-server' }
    )).resolves.toEqual({ queuedDeviceIds: ['device-server'] });

    expect(mockNative.notifyGattServerCharacteristicChanged).toHaveBeenCalledWith(
      'device-server',
      '0000180f-0000-1000-8000-00805f9b34fb',
      '00002a19-0000-1000-8000-00805f9b34fb',
      expect.any(ArrayBuffer),
      expect.any(Function)
    );
  });

  test('GATT server command wrappers reject native failures', async () => {
    mockNative.stopGattServer.mockImplementation((callback) => {
      callback(false, 'Stop failed');
    });
    await expect(BleManager.stopGattServer()).rejects.toThrow('Stop failed');

    mockNative.setGattServerCharacteristicValue.mockImplementation((_serviceId, _characteristicId, _data, callback) => {
      callback(false, 'Characteristic not found');
    });
    await expect(
      BleManager.setGattServerCharacteristicValue('180f', '2a19', [1])
    ).rejects.toThrow('Characteristic not found');
    expect(mockNative.setGattServerCharacteristicValue).toHaveBeenCalledWith(
      '0000180f-0000-1000-8000-00805f9b34fb',
      '00002a19-0000-1000-8000-00805f9b34fb',
      expect.any(ArrayBuffer),
      expect.any(Function)
    );

    mockNative.notifyGattServerCharacteristicChanged.mockImplementation((_deviceId, _serviceId, _characteristicId, _data, callback) => {
      callback(false, [], 'Notify failed');
    });
    await expect(
      BleManager.notifyGattServerCharacteristicChanged('180f', '2a19', [2])
    ).rejects.toThrow('Notify failed');
    expect(mockNative.notifyGattServerCharacteristicChanged).toHaveBeenCalledWith(
      '',
      '0000180f-0000-1000-8000-00805f9b34fb',
      '00002a19-0000-1000-8000-00805f9b34fb',
      expect.any(ArrayBuffer),
      expect.any(Function)
    );

    mockNative.disconnectGattServerDevice.mockImplementation((_deviceId, callback) => {
      callback(false, 'Device is not connected');
    });
    await expect(
      BleManager.disconnectGattServerDevice('device-server')
    ).rejects.toThrow('Device is not connected');
  });
});
