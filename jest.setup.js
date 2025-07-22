// Mock react-native-nitro-modules for testing
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => ({
      destroy: jest.fn(),
      setLogLevel: jest.fn(),
      logLevel: jest.fn(),
      state: jest.fn(),
      onStateChange: jest.fn(),
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      cancelDeviceConnection: jest.fn(),
      isDeviceConnected: jest.fn(),
    })),
  },
}));

// Setup globals for React Native
global.__DEV__ = true;