/**
 * Enum compatibility layer
 * 
 * Provides conversion between Nitro's numeric enums and the original 
 * string-based enums from react-native-ble-plx
 */

import {
  State,
  LogLevel,
  CharacteristicSubscriptionType,
  RefreshGattMoment,
} from '../specs/types';

// String mappings for backward compatibility
export const StateString = {
  [State.Unknown]: 'Unknown',
  [State.Resetting]: 'Resetting',
  [State.Unsupported]: 'Unsupported',
  [State.Unauthorized]: 'Unauthorized',
  [State.PoweredOff]: 'PoweredOff',
  [State.PoweredOn]: 'PoweredOn',
} as const;

export const LogLevelString = {
  [LogLevel.None]: 'None',
  [LogLevel.Verbose]: 'Verbose',
  [LogLevel.Debug]: 'Debug',
  [LogLevel.Info]: 'Info',
  [LogLevel.Warning]: 'Warning',
  [LogLevel.Error]: 'Error',
} as const;

export const CharacteristicSubscriptionTypeString = {
  [CharacteristicSubscriptionType.Notification]: 'notification',
  [CharacteristicSubscriptionType.Indication]: 'indication',
} as const;

export const RefreshGattMomentString = {
  [RefreshGattMoment.OnConnected]: 'OnConnected',
} as const;

// Reverse mappings for converting strings back to numeric enums
const StringToState: { [key: string]: State } = {};
const StringToLogLevel: { [key: string]: LogLevel } = {};
const StringToCharacteristicSubscriptionType: { [key: string]: CharacteristicSubscriptionType } = {};
const StringToRefreshGattMoment: { [key: string]: RefreshGattMoment } = {};

// Build reverse mappings
Object.entries(StateString).forEach(([num, str]) => {
  StringToState[str] = parseInt(num) as State;
});

Object.entries(LogLevelString).forEach(([num, str]) => {
  StringToLogLevel[str] = parseInt(num) as LogLevel;
});

Object.entries(CharacteristicSubscriptionTypeString).forEach(([num, str]) => {
  StringToCharacteristicSubscriptionType[str] = parseInt(num) as CharacteristicSubscriptionType;
});

Object.entries(RefreshGattMomentString).forEach(([num, str]) => {
  StringToRefreshGattMoment[str] = parseInt(num) as RefreshGattMoment;
});

// Conversion functions
export function stateToString(state: State): string {
  return StateString[state] ?? 'Unknown';
}

export function stringToState(stateString: string): State {
  // Handle case insensitive lookup
  const lowerString = stateString.toLowerCase();
  for (const [key, value] of Object.entries(StringToState)) {
    if (key.toLowerCase() === lowerString) {
      return value;
    }
  }
  return State.Unknown;
}

export function logLevelToString(logLevel: LogLevel): string {
  return LogLevelString[logLevel] ?? 'None';
}

export function stringToLogLevel(logLevelString: string): LogLevel {
  // Handle case insensitive lookup
  const lowerString = logLevelString.toLowerCase();
  for (const [key, value] of Object.entries(StringToLogLevel)) {
    if (key.toLowerCase() === lowerString) {
      return value;
    }
  }
  return LogLevel.None;
}

export function characteristicSubscriptionTypeToString(
  type: CharacteristicSubscriptionType
): string {
  return CharacteristicSubscriptionTypeString[type] ?? 'notification';
}

export function stringToCharacteristicSubscriptionType(
  typeString: string
): CharacteristicSubscriptionType {
  // Handle case insensitive lookup
  const lowerString = typeString.toLowerCase();
  for (const [key, value] of Object.entries(StringToCharacteristicSubscriptionType)) {
    if (key.toLowerCase() === lowerString) {
      return value;
    }
  }
  return CharacteristicSubscriptionType.Notification;
}

export function refreshGattMomentToString(moment: RefreshGattMoment): 'OnConnected' {
  return RefreshGattMomentString[moment] as 'OnConnected';
}

export function stringToRefreshGattMoment(momentString: 'OnConnected'): RefreshGattMoment {
  return StringToRefreshGattMoment[momentString] ?? RefreshGattMoment.OnConnected;
}

// Helper function to detect if a value is a string enum vs numeric enum
export function isStringEnumValue(value: any): boolean {
  return typeof value === 'string';
}

// Generic converter that handles both string and numeric enum values
export function normalizeState(state: State | string): State {
  if (typeof state === 'string') {
    return stringToState(state);
  }
  return state;
}

export function normalizeLogLevel(logLevel: LogLevel | string): LogLevel {
  if (typeof logLevel === 'string') {
    return stringToLogLevel(logLevel);
  }
  return logLevel;
}

export function normalizeCharacteristicSubscriptionType(
  type: CharacteristicSubscriptionType | 'notification' | 'indication'
): CharacteristicSubscriptionType {
  if (typeof type === 'string') {
    return stringToCharacteristicSubscriptionType(type);
  }
  return type;
}

export function normalizeRefreshGattMoment(
  moment: RefreshGattMoment | 'OnConnected'
): RefreshGattMoment {
  if (typeof moment === 'string') {
    return stringToRefreshGattMoment(moment);
  }
  return moment;
}