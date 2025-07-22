/**
 * Compatibility layer for react-native-ble-nitro
 * 
 * This module provides compatibility shims and converters to maintain 
 * 100% API compatibility with react-native-ble-plx while working with 
 * Nitro's type system constraints.
 */

export * from './serviceData';
export * from './deviceWrapper';
export * from './constants';

// Explicitly export enum utilities to avoid conflicts
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
} from './enums';