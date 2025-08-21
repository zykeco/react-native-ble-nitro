// Mock the native module import
jest.mock('../specs/NativeBleNitro', () => ({
  __esModule: true,
  default: {
    startScan: jest.fn(),
    stopScan: jest.fn(),
    isScanning: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
    discoverServices: jest.fn(),
    getServices: jest.fn(),
    getCharacteristics: jest.fn(),
    readCharacteristic: jest.fn(),
    writeCharacteristic: jest.fn(),
    subscribeToCharacteristic: jest.fn(),
    unsubscribeFromCharacteristic: jest.fn(),
    isBluetoothEnabled: jest.fn(),
    requestBluetoothEnable: jest.fn(),
    state: jest.fn(),
    subscribeToStateChange: jest.fn(),
  },
  BLEState: { PoweredOn: 5, PoweredOff: 4 },
}));

import { ble as BleNitro } from '../index';

// Get reference to the mocked module
const mockNative = require('../specs/NativeBleNitro').default; // eslint-disable-line @typescript-eslint/no-var-requires

describe('BleNitro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('startScan calls native with correct parameters', async () => {
    mockNative.startScan.mockImplementation((filter, callback) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Just call the callback to simulate finding a device
    });

    const scanCallback = jest.fn();
    await BleNitro.startScan({ serviceUUIDs: ['test'] }, scanCallback);

    expect(mockNative.startScan).toHaveBeenCalledWith(
      {
        serviceUUIDs: ['test'],
        rssiThreshold: -100,
        allowDuplicates: false,
      },
      expect.any(Function)
    );
  });

  test('stopScan calls native and resolves', async () => {
    mockNative.stopScan.mockImplementation((callback) => {
      callback(true, '');
    });

    const result = await BleNitro.stopScan();
    
    expect(mockNative.stopScan).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('connect calls native and resolves with device id', async () => {
    const deviceId = 'test-device';
    mockNative.connect.mockImplementation((id, callback) => {
      callback(true, id, '');
    });

    const result = await BleNitro.connect(deviceId);
    
    expect(mockNative.connect).toHaveBeenCalledWith(deviceId, expect.any(Function));
    expect(result).toBe(deviceId);
  });

  test('connect rejects on error', async () => {
    mockNative.connect.mockImplementation((id, callback) => {
      callback(false, '', 'Connection failed');
    });

    await expect(BleNitro.connect('test')).rejects.toThrow('Connection failed');
  });

  test('isBluetoothEnabled calls native', async () => {
    mockNative.isBluetoothEnabled.mockImplementation((callback) => {
      callback(true);
    });

    const result = await BleNitro.isBluetoothEnabled();
    
    expect(mockNative.isBluetoothEnabled).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('writeCharacteristic requires connected device', async () => {
    await expect(
      BleNitro.writeCharacteristic('device', 'service', 'char', [1, 2, 3])
    ).rejects.toThrow('Device not connected');
  });

  test('readCharacteristic works after connection', async () => {
    // First connect
    mockNative.connect.mockImplementation((id, callback) => {
      callback(true, id, '');
    });
    await BleNitro.connect('device');

    // Then read
    mockNative.readCharacteristic.mockImplementation((device, service, char, callback) => {
      callback(true, '');
    });

    const result = await BleNitro.readCharacteristic('device', 'service', 'char');
    
    expect(mockNative.readCharacteristic).toHaveBeenCalledWith('device', 'service', 'char', expect.any(Function));
    expect(result).toBe(true);
  });

  test('disconnect calls native', async () => {
    // First connect
    mockNative.connect.mockImplementation((id, callback) => {
      callback(true, id, '');
    });
    await BleNitro.connect('device');

    // Then disconnect
    mockNative.disconnect.mockImplementation((id, callback) => {
      callback(true, '');
    });

    const result = await BleNitro.disconnect('device');
    
    expect(mockNative.disconnect).toHaveBeenCalledWith('device', expect.any(Function));
    expect(result).toBe(true);
  });

  test('subscribeToCharacteristic calls callback', async () => {
    // First connect
    mockNative.connect.mockImplementation((id, callback) => {
      callback(true, id, '');
    });
    await BleNitro.connect('device');

    // Mock subscription
    mockNative.subscribeToCharacteristic.mockImplementation((device, service, char, updateCallback, resultCallback) => {
      resultCallback(true, '');
      // Simulate notification
      updateCallback('char-id', [1, 2, 3]);
    });

    const notificationCallback = jest.fn();
    await BleNitro.subscribeToCharacteristic('device', 'service', 'char', notificationCallback);
    
    expect(mockNative.subscribeToCharacteristic).toHaveBeenCalled();
    expect(notificationCallback).toHaveBeenCalledWith('char-id', [1, 2, 3]);
  });
});