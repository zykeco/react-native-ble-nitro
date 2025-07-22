/**
 * React-native-ble-plx compatibility constants
 * 
 * Re-exports all constants and types to maintain API compatibility
 */

// Re-export original string-based constants for backward compatibility
export const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting', 
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
} as const;

export const LogLevel = {
  None: 'None',
  Verbose: 'Verbose',
  Debug: 'Debug',
  Info: 'Info',
  Warning: 'Warning',
  Error: 'Error',
} as const;

// Type definitions for compatibility
export type StateString = typeof State[keyof typeof State];
export type LogLevelString = typeof LogLevel[keyof typeof LogLevel];

// Subscription type constants
export const CharacteristicSubscriptionType = {
  Notification: 'notification',
  Indication: 'indication',
} as const;

export type CharacteristicSubscriptionTypeString = typeof CharacteristicSubscriptionType[keyof typeof CharacteristicSubscriptionType];

// Connection options constants
export const RefreshGattMoment = {
  OnConnected: 'OnConnected',
} as const;

export type RefreshGattMomentString = typeof RefreshGattMoment[keyof typeof RefreshGattMoment];

// Scan mode constants (these remain numeric as in original)
export const ScanMode = {
  Opportunistic: -1,
  LowPower: 0,
  Balanced: 1,
  LowLatency: 2,
} as const;

export const ScanCallbackType = {
  AllMatches: 1,
  FirstMatch: 2,
  MatchLost: 4,
} as const;

export const ConnectionPriority = {
  Balanced: 0,
  High: 1,
  LowPower: 2,
} as const;

// Re-export all BLE error codes
export { 
  BleErrorCode,
  BleATTErrorCode,
  BleIOSErrorCode,
  BleAndroidErrorCode 
} from '../specs/types';