/**
 * Compatibility layer for react-native-ble-nitro
 * 
 * This module provides compatibility shims and converters to maintain 
 * 100% API compatibility with react-native-ble-plx while working with 
 * Nitro's type system constraints.
 */

export * from './serviceData.js';
export * from './deviceWrapper.js';
export * from './constants.js';

// Explicitly export enum utilities and enums to avoid conflicts
export {
  stateToString,
  stringToState,
  logLevelToString,
  stringToLogLevel,
  characteristicSubscriptionTypeToString,
  stringToCharacteristicSubscriptionType,
  normalizeState,
  normalizeLogLevel,
  normalizeCharacteristicSubscriptionType,
  State,
  LogLevel
} from './enums.js';

// Export type literals (not enums) for exact react-native-ble-plx compatibility
export type {
  CharacteristicSubscriptionType,
  RefreshGattMoment
} from './enums.js';