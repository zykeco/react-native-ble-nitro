// Export compatibility layer types and constants
export * from './compatibility/constants';

// Export utility functions
export * from './utils';

// Export the main BleManager instance with compatibility wrapper
export { BleManagerCompat as BleManager, createBleManagerCompat as createBleManager } from './BleManagerCompatFactory';

// Export error handling utilities
export * from './errors/BleError';

// Export device wrapper for compatibility
export { DeviceWrapper as Device } from './compatibility/deviceWrapper';

// Export interfaces for TypeScript (but not runtime values)
export type { 
  BleManagerOptions,
  ScanOptions,
  ConnectionOptions,
  NativeBleError,
  NativeDevice,
  NativeService,
  NativeCharacteristic,
  NativeDescriptor,
  Subscription
} from './specs/types';

// Re-export react-native-ble-plx compatible API
export { fullUUID } from './utils/uuid';