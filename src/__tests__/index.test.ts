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
  readRSSI: jest.fn(),
  discoverServices: jest.fn(),
  getServices: jest.fn(),
  getCharacteristics: jest.fn(),
  readCharacteristic: jest.fn(),
  writeCharacteristic: jest.fn(),
  subscribeToCharacteristic: jest.fn(),
  unsubscribeFromCharacteristic: jest.fn(),
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
}));

jest.mock('../specs/NativeBleNitroFactory', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockNativeInstance),
  },
}));

import { BleNitro } from '../index';

// Get reference to the mocked module
const mockNative = mockNativeInstance;

// Get BLE instance
const BleManager = BleNitro.instance();

describe('BleNitro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('startScan calls native with correct parameters', async () => {
    mockNative.startScan.mockImplementation((filter, callback) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Just call the callback to simulate finding a device
    });

    const scanCallback = jest.fn();
    BleManager.startScan({ serviceUUIDs: ['test'] }, scanCallback);

    expect(mockNative.startScan).toHaveBeenCalledWith(
      {
        serviceUUIDs: ['test'],
        rssiThreshold: -100,
        allowDuplicates: false,
        androidScanMode: 1, // AndroidScanMode.Balanced (default)
      },
      expect.any(Function)
    );
  });

  test('stopScan calls native and resolves', async () => {
    // First start a scan to set _isScanning to true
    mockNative.startScan.mockImplementation((filter, callback) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Just start scanning
    });
    
    const scanCallback = jest.fn();
    BleManager.startScan({ serviceUUIDs: ['test'] }, scanCallback);

    // Now stop the scan
    mockNative.stopScan.mockImplementation(() => true);

    BleManager.stopScan();
    
    expect(mockNative.stopScan).toHaveBeenCalled();
  });

  test('connect calls native and resolves with device id', async () => {
    const deviceId = 'test-device';
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });

    const result = await BleManager.connect(deviceId);

    expect(mockNative.connect).toHaveBeenCalledWith(deviceId, expect.any(Function), undefined, false);
    expect(result).toBe(deviceId);
  });

  test('connect rejects on error', async () => {
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(false, '', 'Connection failed');
    });

    await expect(BleManager.connect('test')).rejects.toThrow('Connection failed');
  });

  test('isBluetoothEnabled calls native', () => {
    mockNative.state.mockReturnValue(5); // PoweredOn

    const result = BleManager.isBluetoothEnabled();
    
    expect(mockNative.state).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('writeCharacteristic requires connected device', async () => {
    const data = [1, 2, 3];
    await expect(
      BleManager.writeCharacteristic('device', 'service', 'char', data)
    ).rejects.toThrow('Device not connected');
  });

  test('writeCharacteristic without response returns empty array', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device-write');

    // Mock writeCharacteristic with new signature (success, responseData, error)
    mockNative.writeCharacteristic.mockImplementation((_deviceId: string, _serviceId: string, _charId: string, _data: ArrayBuffer, withResponse: boolean, callback: (success: boolean, responseData: ArrayBuffer, error: string) => void) => {
      // For withResponse=false, return empty ArrayBuffer
      const emptyBuffer = new ArrayBuffer(0);
      callback(true, emptyBuffer, '');
    });

    const data = [1, 2, 3];
    const result = await BleManager.writeCharacteristic('device-write', 'service', 'char', data, false);

    expect(mockNative.writeCharacteristic).toHaveBeenCalledWith(
      'device-write',
      '0service-0000-1000-8000-00805f9b34fb',
      '0000char-0000-1000-8000-00805f9b34fb',
      expect.any(ArrayBuffer),
      false,
      expect.any(Function)
    );
    expect(result).toEqual([]); // Empty ByteArray for no response
  });

  test('writeCharacteristic with response returns response data', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device-write-resp');

    // Mock writeCharacteristic to return response data
    mockNative.writeCharacteristic.mockImplementation((_deviceId: string, _serviceId: string, _charId: string, _data: ArrayBuffer, withResponse: boolean, callback: (success: boolean, responseData: ArrayBuffer, error: string) => void) => {
      // For withResponse=true, return some response data
      const responseData = new Uint8Array([0xAA, 0xBB, 0xCC]).buffer;
      callback(true, responseData, '');
    });

    const data = [1, 2, 3];
    const result = await BleManager.writeCharacteristic('device-write-resp', 'service', 'char', data, true);

    expect(mockNative.writeCharacteristic).toHaveBeenCalledWith(
      'device-write-resp',
      '0service-0000-1000-8000-00805f9b34fb',
      '0000char-0000-1000-8000-00805f9b34fb',
      expect.any(ArrayBuffer),
      true,
      expect.any(Function)
    );
    expect(result).toEqual([0xAA, 0xBB, 0xCC]); // Response data as ByteArray
  });

  test('readCharacteristic works after connection', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device');

    // Then read
    mockNative.readCharacteristic.mockImplementation((_device: string, _service: string, _char: string, callback: (success: boolean, data: ArrayBuffer, error: string) => void) => {
      const testData = new Uint8Array([85]);
      callback(true, testData.buffer, ''); // Battery level 85%
    });

    const result = await BleManager.readCharacteristic('device', 'service', 'char');

    // UUIDs should be normalized in the call
    expect(mockNative.readCharacteristic).toHaveBeenCalledWith(
      'device',
      '0service-0000-1000-8000-00805f9b34fb',  // 'service' padded to 8 chars
      '0000char-0000-1000-8000-00805f9b34fb',  // 'char' padded to 8 chars
      expect.any(Function)
    );

    // Result should be number array (ByteArray)
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([85]);
  });

  test('disconnect calls native', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device');

    // Then disconnect
    mockNative.disconnect.mockImplementation((_id: string, callback: (success: boolean, error: string) => void) => {
      callback(true, '');
    });

    const result = await BleManager.disconnect('device');

    expect(mockNative.disconnect).toHaveBeenCalledWith('device', expect.any(Function));
    expect(result).toBe(undefined);
  });

  test('subscribeToCharacteristic calls callback', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device');

    // Mock subscription - now returns OperationResult
    mockNative.subscribeToCharacteristic.mockImplementation((_device: string, _service: string, _char: string, updateCallback: (charId: string, data: ArrayBuffer) => void) => {
      // Simulate notification
      const testData = new Uint8Array([1, 2, 3]);
      updateCallback('char-id', testData.buffer);
      // Return OperationResult
      return { success: true, error: null };
    });

    const notificationCallback = jest.fn();
    const subscription = BleManager.subscribeToCharacteristic('device', 'service', 'char', notificationCallback);

    expect(mockNative.subscribeToCharacteristic).toHaveBeenCalled();
    expect(notificationCallback).toHaveBeenCalledWith('char-id', [1, 2, 3]);

    // Verify subscription object
    expect(subscription).toHaveProperty('remove');
    expect(typeof subscription.remove).toBe('function');
  });

  test('connect with disconnect event callback', async () => {
    const deviceId = 'test-device-2'; // Use different device ID to avoid state conflicts
    const onDisconnect = jest.fn();

    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
      // Simulate a disconnect event later
      if (disconnectCallback) {
        setTimeout(() => {
          disconnectCallback(id, true, 'Connection lost'); // interrupted = true
        }, 10);
      }
    });

    const result = await BleManager.connect(deviceId, onDisconnect);

    expect(mockNative.connect).toHaveBeenCalledWith(deviceId, expect.any(Function), expect.any(Function), false);
    expect(result).toBe(deviceId);

    // Wait for disconnect callback
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(onDisconnect).toHaveBeenCalledWith(deviceId, true, 'Connection lost');
  });

  test('readRSSI requires connected device', async () => {
    await expect(
      BleManager.readRSSI('device-not-connected')
    ).rejects.toThrow('Device not connected');
  });

  test('readRSSI works after connection', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device-rssi');

    // Mock readRSSI with new signature (success, rssi, error)
    mockNative.readRSSI.mockImplementation((_deviceId: string, callback: (success: boolean, rssi: number, error: string) => void) => {
      callback(true, -65, ''); // Mock RSSI value of -65 dBm
    });

    const rssi = await BleManager.readRSSI('device-rssi');

    expect(mockNative.readRSSI).toHaveBeenCalledWith(
      'device-rssi',
      expect.any(Function)
    );
    expect(rssi).toBe(-65);
  });

  test('readRSSI handles failure', async () => {
    // First connect
    mockNative.connect.mockImplementation((id: string, callback: (success: boolean, deviceId: string, error: string) => void, _disconnectCallback?: (deviceId: string, interrupted: boolean, error: string) => void) => {
      callback(true, id, '');
    });
    await BleManager.connect('device-rssi-fail');

    // Mock readRSSI failure
    mockNative.readRSSI.mockImplementation((_deviceId: string, callback: (success: boolean, rssi: number, error: string) => void) => {
      callback(false, 0, 'RSSI read failed');
    });

    await expect(BleManager.readRSSI('device-rssi-fail')).rejects.toThrow('RSSI read failed');

    expect(mockNative.readRSSI).toHaveBeenCalledWith(
      'device-rssi-fail',
      expect.any(Function)
    );
  });
});