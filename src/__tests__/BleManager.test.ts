/**
 * BleManager.test.ts
 * React Native BLE Nitro - Unit Tests
 * Copyright © 2025 Zyke (https://zyke.co)
 */

import { BleManager } from '../index';
import { State, LogLevel } from '../specs/types';

// Create a mock Nitro manager
const mockNitroManager = {
  destroy: jest.fn().mockResolvedValue(undefined),
  setLogLevel: jest.fn().mockResolvedValue(LogLevel.Info),
  logLevel: jest.fn().mockResolvedValue(LogLevel.Info),
  state: jest.fn().mockResolvedValue(State.PoweredOn),
  onStateChange: jest.fn().mockReturnValue({ remove: jest.fn() }),
  startDeviceScan: jest.fn().mockResolvedValue(undefined),
  stopDeviceScan: jest.fn().mockResolvedValue(undefined),
  connectToDevice: jest.fn().mockResolvedValue({
    id: 'test-device',
    name: 'Test Device',
    deviceName: 'Test Device',
    rssi: -50,
    mtu: 23
  }),
  cancelDeviceConnection: jest.fn().mockResolvedValue({
    id: 'test-device',
    name: 'Test Device',
    deviceName: 'Test Device'
  }),
  isDeviceConnected: jest.fn().mockResolvedValue(true),
  discoverAllServicesAndCharacteristicsForDevice: jest.fn().mockResolvedValue({
    id: 'test-device',
    name: 'Test Device',
    deviceName: 'Test Device'
  }),
  servicesForDevice: jest.fn().mockResolvedValue([
    {
      id: 1,
      uuid: '12345678-1234-5678-9abc-123456789abc',
      deviceID: 'test-device',
      isPrimary: true
    }
  ]),
  characteristicsForDevice: jest.fn().mockResolvedValue([
    {
      id: 1,
      uuid: '87654321-4321-8765-cba9-987654321cba',
      serviceID: 1,
      serviceUUID: '12345678-1234-5678-9abc-123456789abc',
      deviceID: 'test-device',
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: false,
      isNotifiable: true,
      isNotifying: false,
      isIndicatable: false,
      value: null
    }
  ]),
  readCharacteristicForDevice: jest.fn().mockResolvedValue({
    id: 1,
    uuid: '87654321-4321-8765-cba9-987654321cba',
    value: 'dGVzdCB2YWx1ZQ==' // "test value" in base64
  }),
  writeCharacteristicWithResponseForDevice: jest.fn().mockResolvedValue({
    id: 1,
    uuid: '87654321-4321-8765-cba9-987654321cba',
    value: 'dGVzdCB2YWx1ZQ=='
  }),
  monitorCharacteristicForDevice: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

// Mock the Nitro module
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockNitroManager),
  },
}));

// Mock the BleManagerFactory
jest.mock('../BleManagerFactory', () => ({
  createBleManager: jest.fn(() => mockNitroManager),
}));

describe('BleManager', () => {
  let manager: BleManager;

  beforeEach(() => {
    manager = new BleManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  describe('Initialization', () => {
    it('should create a BleManager instance', () => {
      expect(manager).toBeInstanceOf(BleManager);
    });

    it('should set log level', async () => {
      const result = await manager.setLogLevel(LogLevel.Info);
      expect(result).toBe('Info'); // BleManagerCompat returns strings for compatibility
    });

    it('should get current log level', async () => {
      await manager.setLogLevel(LogLevel.Debug);
      const level = await manager.logLevel();
      expect(level).toBe('Info'); // BleManagerCompat returns strings for compatibility
    });
  });

  describe('State Management', () => {
    it('should get current state', async () => {
      const state = await manager.state();
      expect(state).toBe('PoweredOn'); // BleManagerCompat converts State.PoweredOn -> 'PoweredOn'
    });

    it('should listen to state changes', async () => {
      const listener = jest.fn();
      const subscription = manager.onStateChange(listener, true);

      expect(subscription).toHaveProperty('remove');
      expect(typeof subscription.remove).toBe('function');
    });
  });

  describe('Device Scanning', () => {
    it('should start device scan', async () => {
      const listener = jest.fn();
      await manager.startDeviceScan(null, null, listener);
      
      // Verify that the native method was called
      expect(mockNitroManager.startDeviceScan).toHaveBeenCalledWith(
        null,
        null,
        expect.any(Function)
      );
    });

    it('should stop device scan', async () => {
      await manager.stopDeviceScan();
      
      expect(mockNitroManager.stopDeviceScan).toHaveBeenCalled();
    });

    it('should filter UUIDs when scanning', async () => {
      const uuids = ['12345678-1234-5678-9abc-123456789abc'];
      const listener = jest.fn();
      
      await manager.startDeviceScan(uuids, null, listener);
      
      expect(mockNitroManager.startDeviceScan).toHaveBeenCalledWith(
        uuids,
        null,
        expect.any(Function)
      );
    });
  });

  describe('Device Connection', () => {
    const deviceId = 'test-device';

    it('should connect to device', async () => {
      const device = await manager.connectToDevice(deviceId);
      
      expect(device.id).toBe(deviceId);
      expect(device.name).toBe('Test Device');
      expect(mockNitroManager.connectToDevice).toHaveBeenCalledWith(
        deviceId,
        expect.any(Object)
      );
    });

    it('should check if device is connected', async () => {
      const isConnected = await manager.isDeviceConnected(deviceId);
      expect(isConnected).toBe(true);
    });

    it('should cancel device connection', async () => {
      const device = await manager.cancelDeviceConnection(deviceId);
      expect(device.id).toBe(deviceId);
    });

    it('should discover services and characteristics', async () => {
      const device = await manager.discoverAllServicesAndCharacteristicsForDevice(deviceId);
      expect(device.id).toBe(deviceId);
    });
  });

  describe('GATT Operations', () => {
    const deviceId = 'test-device';
    const serviceUUID = '12345678-1234-5678-9abc-123456789abc';
    const characteristicUUID = '87654321-4321-8765-cba9-987654321cba';

    it('should list services for device', async () => {
      const services = await manager.servicesForDevice(deviceId);
      expect(services).toHaveLength(1);
      expect(services[0].uuid).toBe(serviceUUID);
    });

    it('should list characteristics for service', async () => {
      const characteristics = await manager.characteristicsForDevice(deviceId, serviceUUID);
      expect(characteristics).toHaveLength(1);
      expect(characteristics[0].uuid).toBe(characteristicUUID);
    });

    it('should read characteristic value', async () => {
      const characteristic = await manager.readCharacteristicForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID
      );
      
      expect(characteristic.value).toBe('dGVzdCB2YWx1ZQ==');
    });

    it('should write characteristic with response', async () => {
      const value = 'dGVzdCB2YWx1ZQ=='; // "test value" in base64
      
      const characteristic = await manager.writeCharacteristicWithResponseForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        value
      );
      
      expect(characteristic.value).toBe(value);
    });

    it('should monitor characteristic for changes', async () => {
      const listener = jest.fn();
      
      const subscription = manager.monitorCharacteristicForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        listener
      );
      
      expect(subscription).toHaveProperty('remove');
      expect(mockNitroManager.monitorCharacteristicForDevice).toHaveBeenCalledWith(
        deviceId,
        serviceUUID,
        characteristicUUID,
        expect.any(Function),
        undefined,
        undefined
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock a connection failure
      const mockError = new Error('Connection failed');
      (mockNitroManager.connectToDevice as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(manager.connectToDevice('invalid-device')).rejects.toThrow('Connection failed');
    });

    it('should handle scan start errors', async () => {
      const mockError = new Error('Scan failed');
      (mockNitroManager.startDeviceScan as jest.Mock).mockRejectedValueOnce(mockError);

      const listener = jest.fn();
      await expect(manager.startDeviceScan(null, null, listener)).rejects.toThrow('Scan failed');
    });
  });

  describe('Cleanup', () => {
    it('should destroy manager and cleanup resources', async () => {
      await manager.destroy();
      expect(mockNitroManager.destroy).toHaveBeenCalled();
    });
  });
});

describe('Device Wrapper Compatibility', () => {
  let manager: BleManager;

  beforeEach(() => {
    manager = new BleManager();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  it('should provide react-native-ble-plx compatible API', async () => {
    const deviceId = 'test-device';
    
    // Connect to device
    const device = await manager.connectToDevice(deviceId);
    
    // The device should have all expected properties
    expect(device).toHaveProperty('id');
    expect(device).toHaveProperty('name');
    expect(device).toHaveProperty('rssi');
    expect(device).toHaveProperty('mtu');
    
    // The device should have connect/disconnect methods
    expect(device).toHaveProperty('connect');
    expect(device).toHaveProperty('cancelConnection');
    expect(device).toHaveProperty('isConnected');
    expect(device).toHaveProperty('discoverAllServicesAndCharacteristics');
    
    // All methods should be functions
    expect(typeof device.connect).toBe('function');
    expect(typeof device.cancelConnection).toBe('function');
    expect(typeof device.isConnected).toBe('function');
    expect(typeof device.discoverAllServicesAndCharacteristics).toBe('function');
  });

  it('should convert enum values to strings for compatibility', async () => {
    const state = await manager.state();
    
    // State should be a string value (mocked return value is 'PoweredOn')
    expect(typeof state).toBe('string');
    expect(state).toBe('PoweredOn');
    
    // The compatibility layer should handle string/number conversion
    expect(State.PoweredOn).toBe(5); // Numeric enum value
  });
});