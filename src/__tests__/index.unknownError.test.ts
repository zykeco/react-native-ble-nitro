// Mock the native module import
const mockNativeInstance = {
  setRestoreStateCallback: jest.fn(),
  startScan: jest.fn(),
  stopScan: jest.fn(),
  isScanning: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn(),
  requestMTU: jest.fn(),
  requestConnectionPriority: jest.fn(),
  readRSSI: jest.fn(),
  discoverServices: jest.fn(),
  discoverServicesWithCharacteristics: jest.fn(),
  getServices: jest.fn(),
  getCharacteristics: jest.fn(),
  readCharacteristic: jest.fn(),
  writeCharacteristic: jest.fn(),
  subscribeToCharacteristic: jest.fn(),
  unsubscribeFromCharacteristic: jest.fn(),
  isSubscribedToCharacteristic: jest.fn(),
  getConnectedDevices: jest.fn(),
  requestBluetoothEnable: jest.fn(),
  state: jest.fn(),
  subscribeToStateChange: jest.fn(),
  unsubscribeFromStateChange: jest.fn(),
  openSettings: jest.fn(),
  restoreStateIdentifier: null,
};

jest.mock('../specs/NativeBleNitro', () => ({
  __esModule: true,
  default: mockNativeInstance,
  BLEState: {
    Unknown: 0,
    Resetting: 1,
    Unsupported: 2,
    Unauthorized: 3,
    PoweredOff: 4,
    PoweredOn: 5
  },
  AndroidScanMode: {
    LowLatency: 0,
    Balanced: 1,
    LowPower: 2,
    Opportunistic: 3
  },
  AndroidConnectionPriority: {
    Balanced: 0,
    High: 1,
    LowPower: 2,
  },
}));

jest.mock('../specs/NativeBleNitroFactory', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockNativeInstance),
  },
}));

import { BleNitro, BleErrorBase } from '../index';

// Get reference to the mocked module
const mockNative = mockNativeInstance;

// Get BLE instance
const BleManager = BleNitro.instance();

describe('native failure without an error object', () => {
  type NativeCallback = (...args: unknown[]) => void;

  // Invokes the native method's completion callback (always its last function
  // argument) with a failure result and no error object.
  const failWithoutError = (...failureArgs: unknown[]) => (...args: unknown[]) => {
    const callbacks = args.filter((arg): arg is NativeCallback => typeof arg === 'function');
    const callback = callbacks[callbacks.length - 1];
    callback?.(...failureArgs);
  };

  const cases: { label: string, native: jest.Mock, failureArgs: unknown[], connected: boolean, invoke: () => Promise<unknown> }[] = [
    {
      label: 'connect',
      native: mockNative.connect,
      failureArgs: [false, '', undefined],
      connected: false,
      invoke: () => BleManager.connect('device-unknown'),
    },
    {
      label: 'disconnect',
      native: mockNative.disconnect,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.disconnect('device-unknown'),
    },
    {
      label: 'readRSSI',
      native: mockNative.readRSSI,
      failureArgs: [false, 0, undefined],
      connected: true,
      invoke: () => BleManager.readRSSI('device-unknown'),
    },
    {
      label: 'discoverServices',
      native: mockNative.discoverServices,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.discoverServices('device-unknown'),
    },
    {
      label: 'getServicesWithCharacteristics',
      native: mockNative.discoverServicesWithCharacteristics,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.getServicesWithCharacteristics('device-unknown'),
    },
    {
      label: 'readCharacteristic',
      native: mockNative.readCharacteristic,
      failureArgs: [false, new ArrayBuffer(0), undefined],
      connected: true,
      invoke: () => BleManager.readCharacteristic('device-unknown', 'service', 'char'),
    },
    {
      label: 'writeCharacteristic',
      native: mockNative.writeCharacteristic,
      failureArgs: [false, new ArrayBuffer(0), undefined],
      connected: true,
      invoke: () => BleManager.writeCharacteristic('device-unknown', 'service', 'char', [0x01]),
    },
    {
      label: 'subscribeToCharacteristic',
      native: mockNative.subscribeToCharacteristic,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.subscribeToCharacteristic('device-unknown', 'service', 'char', jest.fn()),
    },
    {
      label: 'unsubscribeFromCharacteristic',
      native: mockNative.unsubscribeFromCharacteristic,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.unsubscribeFromCharacteristic('device-unknown', 'service', 'char'),
    },
    {
      label: 'requestBluetoothEnable',
      native: mockNative.requestBluetoothEnable,
      failureArgs: [false, undefined],
      connected: true,
      invoke: () => BleManager.requestBluetoothEnable(),
    },
  ];

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each(cases)('$label rejects with an Unknown error message', async ({ native, failureArgs, connected, invoke }) => {
    mockNative.isConnected.mockReturnValue(connected);
    native.mockImplementation(failWithoutError(...failureArgs));

    const rejection = await invoke().then(() => undefined, (error: unknown) => error);

    expect(rejection).toBeInstanceOf(Error);
    expect(rejection).not.toBeInstanceOf(BleErrorBase); // neither platform nor library error
    expect((rejection as Error).message).toMatch(/^Unknown error: /);
  });
});
