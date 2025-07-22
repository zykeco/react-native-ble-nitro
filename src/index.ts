// Export compatibility layer types and constants
export * from './compatibility/constants.js';

// Export utility functions
export * from './utils/index.js';

// Export the main BleManager instance with compatibility wrapper
export { BleManagerCompat as BleManager, createBleManagerCompat as createBleManager } from './BleManagerCompatFactory.js';

// Export error handling utilities
export * from './errors/BleError.js';

// Export device wrapper for compatibility
export { DeviceWrapper as Device } from './compatibility/deviceWrapper.js';

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
} from './specs/types.js';

// Export react-native-ble-plx compatible enum types (drop-in replacement)
export {
  State,
  LogLevel
} from './compatibility/enums.js';

// Export react-native-ble-plx compatible type literals (drop-in replacement)  
export type {
  CharacteristicSubscriptionType,
  RefreshGattMoment
} from './compatibility/enums.js';

// Re-export react-native-ble-plx compatible API
export { fullUUID } from './utils/uuid.js';