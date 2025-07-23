// Export compatibility layer types and constants
export * from './compatibility/constants';

// Export utility functions
export * from './utils/index';

// Export the main BleManager instance with compatibility wrapper
export { BleManagerCompat as BleManager, createBleManagerCompat as createBleManager } from './BleManagerCompatFactory';

// Export BleManager factory utilities (for internal use by error handling)
export { getCustomErrorMessage, getStoredCallbacks } from './BleManagerFactory';

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

// Export react-native-ble-plx compatible enum types (drop-in replacement)
export {
  State,
  LogLevel
} from './compatibility/enums';

// Export react-native-ble-plx compatible type literals (drop-in replacement)  
export type {
  CharacteristicSubscriptionType,
  RefreshGattMoment
} from './compatibility/enums';

// Re-export react-native-ble-plx compatible API
export { fullUUID } from './utils/uuid';