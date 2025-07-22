/**
 * deviceWrapper.test.ts
 * React Native BLE Nitro - Device Wrapper Tests
 * Copyright © 2025 Zyke (https://zyke.co)
 */

import { DeviceWrapper, ServiceWrapper, CharacteristicWrapper, DescriptorWrapper } from '../../compatibility/deviceWrapper';
import { ConnectionPriority, CharacteristicSubscriptionType } from '../../specs/types';

// Mock Nitro Device
const createMockNitroDevice = () => ({
  id: 'test-device-id',
  deviceName: 'Test Device',
  rssi: -50,
  mtu: 247,
  manufacturerData: 'AQIDBA==', // [1, 2, 3, 4] in base64
  serviceData: [
    { uuid: '180f', data: 'ZA==' }, // Battery service with value 100
    { uuid: '1234', data: 'dGVzdA==' } // Custom service with "test"
  ],
  serviceUUIDs: ['180f', '1234-5678-9abc-def0-123456789abc'],
  localName: 'Local Test Device',
  txPowerLevel: 4,
  solicitedServiceUUIDs: ['abcd'],
  isConnectable: true,
  overflowServiceUUIDs: ['efgh'],
  rawScanRecord: 'AQIDBAU=',
  
  // Mock methods
  requestConnectionPriority: jest.fn().mockResolvedValue({}),
  readRSSI: jest.fn().mockResolvedValue({}),
  requestMTU: jest.fn().mockResolvedValue({}),
  connect: jest.fn().mockResolvedValue({}),
  cancelConnection: jest.fn().mockResolvedValue({}),
  isConnected: jest.fn().mockResolvedValue(true),
  onDisconnected: jest.fn().mockReturnValue({ remove: jest.fn() }),
  discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({}),
  services: jest.fn().mockResolvedValue([]),
  characteristicsForService: jest.fn().mockResolvedValue([]),
  readCharacteristicForService: jest.fn().mockResolvedValue({}),
  writeCharacteristicWithResponseForService: jest.fn().mockResolvedValue({}),
  writeCharacteristicWithoutResponseForService: jest.fn().mockResolvedValue({}),
  monitorCharacteristicForService: jest.fn().mockReturnValue({ remove: jest.fn() }),
  descriptorsForService: jest.fn().mockResolvedValue([]),
  readDescriptorForService: jest.fn().mockResolvedValue({}),
  writeDescriptorForService: jest.fn().mockResolvedValue({})
});

describe('DeviceWrapper', () => {
  let mockNitroDevice: ReturnType<typeof createMockNitroDevice>;
  let deviceWrapper: DeviceWrapper;

  beforeEach(() => {
    mockNitroDevice = createMockNitroDevice();
    deviceWrapper = new DeviceWrapper(mockNitroDevice);
    jest.clearAllMocks();
  });

  describe('Property Mapping', () => {
    it('should map device identification properties correctly', () => {
      expect(deviceWrapper.id).toBe('test-device-id');
      expect(deviceWrapper.name).toBe('Test Device'); // Maps from deviceName
      expect(deviceWrapper.rssi).toBe(-50);
      expect(deviceWrapper.mtu).toBe(247);
    });

    it('should handle null device name', () => {
      mockNitroDevice.deviceName = null;
      const wrapper = new DeviceWrapper(mockNitroDevice);
      expect(wrapper.name).toBeNull();
    });

    it('should map advertisement data properties', () => {
      expect(deviceWrapper.manufacturerData).toBe('AQIDBA==');
      expect(deviceWrapper.rawScanRecord).toBe('AQIDBAU=');
      expect(deviceWrapper.localName).toBe('Local Test Device');
      expect(deviceWrapper.txPowerLevel).toBe(4);
      expect(deviceWrapper.isConnectable).toBe(true);
    });

    it('should map service-related properties', () => {
      expect(deviceWrapper.serviceUUIDs).toEqual(['180f', '1234-5678-9abc-def0-123456789abc']);
      expect(deviceWrapper.solicitedServiceUUIDs).toEqual(['abcd']);
      expect(deviceWrapper.overflowServiceUUIDs).toEqual(['efgh']);
    });

    it('should convert service data array to map format', () => {
      const serviceData = deviceWrapper.serviceData;
      expect(serviceData).toEqual({
        '180f': 'ZA==',
        '1234': 'dGVzdA=='
      });
    });

    it('should handle null service data', () => {
      mockNitroDevice.serviceData = null;
      const wrapper = new DeviceWrapper(mockNitroDevice);
      expect(wrapper.serviceData).toBeNull();
    });
  });

  describe('Connection Management', () => {
    it('should request connection priority', async () => {
      mockNitroDevice.requestConnectionPriority.mockResolvedValue(mockNitroDevice);
      
      const result = await deviceWrapper.requestConnectionPriority(
        ConnectionPriority.High,
        'transaction-123'
      );

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.requestConnectionPriority).toHaveBeenCalledWith(
        ConnectionPriority.High,
        'transaction-123'
      );
    });

    it('should read RSSI', async () => {
      const updatedDevice = { ...mockNitroDevice, rssi: -45 };
      mockNitroDevice.readRSSI.mockResolvedValue(updatedDevice);

      const result = await deviceWrapper.readRSSI('transaction-456');

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.readRSSI).toHaveBeenCalledWith('transaction-456');
    });

    it('should request MTU change', async () => {
      const updatedDevice = { ...mockNitroDevice, mtu: 512 };
      mockNitroDevice.requestMTU.mockResolvedValue(updatedDevice);

      const result = await deviceWrapper.requestMTU(512, 'mtu-transaction');

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.requestMTU).toHaveBeenCalledWith(512, 'mtu-transaction');
    });

    it('should connect with default options', async () => {
      mockNitroDevice.connect.mockResolvedValue(mockNitroDevice);

      const result = await deviceWrapper.connect();

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.connect).toHaveBeenCalledWith({
        autoConnect: false,
        requestMTU: 23,
        timeout: 0
      });
    });

    it('should connect with custom options', async () => {
      mockNitroDevice.connect.mockResolvedValue(mockNitroDevice);

      const result = await deviceWrapper.connect({
        autoConnect: true,
        requestMTU: 247,
        timeout: 5000
      });

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.connect).toHaveBeenCalledWith({
        autoConnect: true,
        requestMTU: 247,
        timeout: 5000
      });
    });

    it('should cancel connection', async () => {
      mockNitroDevice.cancelConnection.mockResolvedValue(mockNitroDevice);

      const result = await deviceWrapper.cancelConnection();

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.cancelConnection).toHaveBeenCalled();
    });

    it('should check connection status', async () => {
      mockNitroDevice.isConnected.mockResolvedValue(true);

      const result = await deviceWrapper.isConnected();

      expect(result).toBe(true);
      expect(mockNitroDevice.isConnected).toHaveBeenCalled();
    });

    it('should handle disconnection listener', () => {
      const listener = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      mockNitroDevice.onDisconnected.mockReturnValue(mockSubscription);

      const subscription = deviceWrapper.onDisconnected(listener);

      expect(subscription).toBe(mockSubscription);
      expect(mockNitroDevice.onDisconnected).toHaveBeenCalled();

      // Verify the listener wrapper is called correctly
      const callArgs = mockNitroDevice.onDisconnected.mock.calls[0][0];
      const mockError = new Error('Disconnected');
      const mockDevice = { ...mockNitroDevice };

      callArgs(mockError, mockDevice);
      expect(listener).toHaveBeenCalledWith(mockError, expect.any(DeviceWrapper));
    });
  });

  describe('Service Discovery', () => {
    it('should discover all services and characteristics', async () => {
      mockNitroDevice.discoverAllServicesAndCharacteristics.mockResolvedValue(mockNitroDevice);

      const result = await deviceWrapper.discoverAllServicesAndCharacteristics('discovery-tx');

      expect(result).toBeInstanceOf(DeviceWrapper);
      expect(mockNitroDevice.discoverAllServicesAndCharacteristics).toHaveBeenCalledWith('discovery-tx');
    });

    it('should get services list', async () => {
      const mockServices = [
        { id: 1, uuid: '180f', deviceID: 'test-device-id', isPrimary: true }
      ];
      mockNitroDevice.services.mockResolvedValue(mockServices);

      const result = await deviceWrapper.services();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ServiceWrapper);
      expect(mockNitroDevice.services).toHaveBeenCalled();
    });
  });

  describe('Characteristic Operations', () => {
    const serviceUUID = '180f';
    const characteristicUUID = '2a19';

    it('should get characteristics for service', async () => {
      const mockCharacteristics = [
        {
          id: 1,
          uuid: characteristicUUID,
          serviceID: 1,
          serviceUUID,
          deviceID: 'test-device-id',
          isReadable: true,
          isWritableWithResponse: false,
          isWritableWithoutResponse: false,
          isNotifiable: true,
          isNotifying: false,
          isIndicatable: false,
          value: null
        }
      ];
      mockNitroDevice.characteristicsForService.mockResolvedValue(mockCharacteristics);

      const result = await deviceWrapper.characteristicsForService(serviceUUID);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(CharacteristicWrapper);
      expect(mockNitroDevice.characteristicsForService).toHaveBeenCalledWith(serviceUUID);
    });

    it('should read characteristic', async () => {
      const mockCharacteristic = {
        id: 1,
        uuid: characteristicUUID,
        value: 'dGVzdA=='
      };
      mockNitroDevice.readCharacteristicForService.mockResolvedValue(mockCharacteristic);

      const result = await deviceWrapper.readCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        'read-tx'
      );

      expect(result).toBeInstanceOf(CharacteristicWrapper);
      expect(mockNitroDevice.readCharacteristicForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        'read-tx'
      );
    });

    it('should write characteristic with response', async () => {
      const value = 'dGVzdCB2YWx1ZQ==';
      const mockCharacteristic = {
        id: 1,
        uuid: characteristicUUID,
        value
      };
      mockNitroDevice.writeCharacteristicWithResponseForService.mockResolvedValue(mockCharacteristic);

      const result = await deviceWrapper.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        value,
        'write-tx'
      );

      expect(result).toBeInstanceOf(CharacteristicWrapper);
      expect(mockNitroDevice.writeCharacteristicWithResponseForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        value,
        'write-tx'
      );
    });

    it('should write characteristic without response', async () => {
      const value = 'dGVzdA==';
      const mockCharacteristic = {
        id: 1,
        uuid: characteristicUUID,
        value
      };
      mockNitroDevice.writeCharacteristicWithoutResponseForService.mockResolvedValue(mockCharacteristic);

      const result = await deviceWrapper.writeCharacteristicWithoutResponseForService(
        serviceUUID,
        characteristicUUID,
        value
      );

      expect(result).toBeInstanceOf(CharacteristicWrapper);
      expect(mockNitroDevice.writeCharacteristicWithoutResponseForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        value,
        undefined
      );
    });

    it('should monitor characteristic for changes', () => {
      const listener = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      mockNitroDevice.monitorCharacteristicForService.mockReturnValue(mockSubscription);

      const result = deviceWrapper.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        listener,
        'monitor-tx',
        'notification'
      );

      expect(result).toBe(mockSubscription);
      expect(mockNitroDevice.monitorCharacteristicForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        expect.any(Function),
        'monitor-tx',
        CharacteristicSubscriptionType.Notification
      );

      // Test the listener wrapper
      const callArgs = mockNitroDevice.monitorCharacteristicForService.mock.calls[0][2];
      const mockError = null;
      const mockCharacteristic = { id: 1, uuid: characteristicUUID };

      callArgs(mockError, mockCharacteristic);
      expect(listener).toHaveBeenCalledWith(mockError, expect.any(CharacteristicWrapper));
    });

    it('should monitor characteristic without subscription type', () => {
      const listener = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      mockNitroDevice.monitorCharacteristicForService.mockReturnValue(mockSubscription);

      deviceWrapper.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        listener
      );

      expect(mockNitroDevice.monitorCharacteristicForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        expect.any(Function),
        undefined,
        undefined
      );
    });
  });

  describe('Descriptor Operations', () => {
    const serviceUUID = '180f';
    const characteristicUUID = '2a19';
    const descriptorUUID = '2902';

    it('should get descriptors for characteristic', async () => {
      const mockDescriptors = [
        {
          id: 1,
          uuid: descriptorUUID,
          characteristicID: 1,
          characteristicUUID,
          serviceID: 1,
          serviceUUID,
          deviceID: 'test-device-id',
          value: null
        }
      ];
      mockNitroDevice.descriptorsForService.mockResolvedValue(mockDescriptors);

      const result = await deviceWrapper.descriptorsForService(serviceUUID, characteristicUUID);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(DescriptorWrapper);
      expect(mockNitroDevice.descriptorsForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID
      );
    });

    it('should read descriptor', async () => {
      const mockDescriptor = {
        id: 1,
        uuid: descriptorUUID,
        value: 'AQA=' // [1, 0] in base64
      };
      mockNitroDevice.readDescriptorForService.mockResolvedValue(mockDescriptor);

      const result = await deviceWrapper.readDescriptorForService(
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        'descriptor-read-tx'
      );

      expect(result).toBeInstanceOf(DescriptorWrapper);
      expect(mockNitroDevice.readDescriptorForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        'descriptor-read-tx'
      );
    });

    it('should write descriptor', async () => {
      const value = 'AQA=';
      const mockDescriptor = {
        id: 1,
        uuid: descriptorUUID,
        value
      };
      mockNitroDevice.writeDescriptorForService.mockResolvedValue(mockDescriptor);

      const result = await deviceWrapper.writeDescriptorForService(
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        value,
        'descriptor-write-tx'
      );

      expect(result).toBeInstanceOf(DescriptorWrapper);
      expect(mockNitroDevice.writeDescriptorForService).toHaveBeenCalledWith(
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        value,
        'descriptor-write-tx'
      );
    });
  });
});

describe('ServiceWrapper', () => {
  let mockService: any;
  let mockNitroDevice: any;
  let serviceWrapper: ServiceWrapper;

  beforeEach(() => {
    mockService = {
      id: 1,
      uuid: '180f',
      deviceID: 'test-device',
      isPrimary: true
    };

    mockNitroDevice = createMockNitroDevice();
    serviceWrapper = new ServiceWrapper(mockService, mockNitroDevice);
  });

  it('should expose service properties', () => {
    expect(serviceWrapper.id).toBe(1);
    expect(serviceWrapper.uuid).toBe('180f');
    expect(serviceWrapper.deviceID).toBe('test-device');
    expect(serviceWrapper.isPrimary).toBe(true);
  });

  it('should delegate characteristics method to device', async () => {
    mockNitroDevice.characteristicsForService.mockResolvedValue([]);

    await serviceWrapper.characteristics();

    expect(mockNitroDevice.characteristicsForService).toHaveBeenCalledWith('180f');
  });

  it('should delegate read characteristic method to device', async () => {
    const characteristicUUID = '2a19';
    mockNitroDevice.readCharacteristicForService.mockResolvedValue({});

    await serviceWrapper.readCharacteristic(characteristicUUID, 'tx-123');

    expect(mockNitroDevice.readCharacteristicForService).toHaveBeenCalledWith(
      '180f',
      characteristicUUID,
      'tx-123'
    );
  });
});

describe('CharacteristicWrapper', () => {
  let mockCharacteristic: any;
  let mockNitroDevice: any;
  let characteristicWrapper: CharacteristicWrapper;

  beforeEach(() => {
    mockCharacteristic = {
      id: 1,
      uuid: '2a19',
      serviceID: 1,
      serviceUUID: '180f',
      deviceID: 'test-device',
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: false,
      isNotifiable: true,
      isNotifying: false,
      isIndicatable: false,
      value: 'dGVzdA=='
    };

    mockNitroDevice = createMockNitroDevice();
    characteristicWrapper = new CharacteristicWrapper(mockCharacteristic, mockNitroDevice);
  });

  it('should expose characteristic properties', () => {
    expect(characteristicWrapper.id).toBe(1);
    expect(characteristicWrapper.uuid).toBe('2a19');
    expect(characteristicWrapper.serviceID).toBe(1);
    expect(characteristicWrapper.serviceUUID).toBe('180f');
    expect(characteristicWrapper.deviceID).toBe('test-device');
    expect(characteristicWrapper.isReadable).toBe(true);
    expect(characteristicWrapper.isWritableWithResponse).toBe(true);
    expect(characteristicWrapper.isWritableWithoutResponse).toBe(false);
    expect(characteristicWrapper.isNotifiable).toBe(true);
    expect(characteristicWrapper.isNotifying).toBe(false);
    expect(characteristicWrapper.isIndicatable).toBe(false);
    expect(characteristicWrapper.value).toBe('dGVzdA==');
  });

  it('should delegate read method to device', async () => {
    mockNitroDevice.readCharacteristicForService.mockResolvedValue(mockCharacteristic);

    await characteristicWrapper.read('read-tx');

    expect(mockNitroDevice.readCharacteristicForService).toHaveBeenCalledWith(
      '180f',
      '2a19',
      'read-tx'
    );
  });
});