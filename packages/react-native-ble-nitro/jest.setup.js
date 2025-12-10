// Create a mock native implementation that we can control in tests
const createMockNativeModule = () => ({
  // Scanning operations
  startScan: jest.fn(),
  stopScan: jest.fn(),
  isScanning: jest.fn(),
  
  // Connection management
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn(),
  
  // Service discovery
  discoverServices: jest.fn(),
  getServices: jest.fn(),
  getCharacteristics: jest.fn(),
  
  // Characteristic operations
  readCharacteristic: jest.fn(),
  writeCharacteristic: jest.fn(),
  subscribeToCharacteristic: jest.fn(),
  unsubscribeFromCharacteristic: jest.fn(),
  
  // Bluetooth state management
  isBluetoothEnabled: jest.fn(),
  requestBluetoothEnable: jest.fn(),
  state: jest.fn(),
  subscribeToStateChange: jest.fn(),
});

// Mock react-native-nitro-modules for testing
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => createMockNativeModule()),
  },
}));

// Make the mock creator available globally for tests
global.createMockNativeModule = createMockNativeModule;

// Setup globals for React Native
global.__DEV__ = true;