/**
 * React Native BLE Plx Compatible Enums and Types
 * 
 * These match the exact types from react-native-ble-plx for drop-in compatibility.
 * This module provides conversion between Nitro's numeric enums and react-native-ble-plx types.
 */

// Import Nitro's numeric enums with aliases to avoid naming conflicts
import {
  State as NitroState,
  LogLevel as NitroLogLevel,
  CharacteristicSubscriptionType as NitroCharacteristicSubscriptionType,
  RefreshGattMoment as NitroRefreshGattMoment,
} from '../specs/types';

// Define exact string enums and types matching react-native-ble-plx
export enum State {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn'
}

export enum LogLevel {
  None = 'None',
  Verbose = 'Verbose',
  Debug = 'Debug',
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error'
}

// These are type literals in react-native-ble-plx, not enums
export type CharacteristicSubscriptionType = 'notification' | 'indication';
export type RefreshGattMoment = 'OnConnected';

// Conversion functions from Nitro numeric enums to react-native-ble-plx string enums/types
export function stateToString(state: NitroState): State {
  const mapping = {
    [NitroState.Unknown]: State.Unknown,
    [NitroState.Resetting]: State.Resetting,
    [NitroState.Unsupported]: State.Unsupported,
    [NitroState.Unauthorized]: State.Unauthorized,
    [NitroState.PoweredOff]: State.PoweredOff,
    [NitroState.PoweredOn]: State.PoweredOn,
  };
  return mapping[state] ?? State.Unknown;
}

export function logLevelToString(logLevel: NitroLogLevel): LogLevel {
  const mapping = {
    [NitroLogLevel.None]: LogLevel.None,
    [NitroLogLevel.Verbose]: LogLevel.Verbose,
    [NitroLogLevel.Debug]: LogLevel.Debug,
    [NitroLogLevel.Info]: LogLevel.Info,
    [NitroLogLevel.Warning]: LogLevel.Warning,
    [NitroLogLevel.Error]: LogLevel.Error,
  };
  return mapping[logLevel] ?? LogLevel.None;
}

export function characteristicSubscriptionTypeToString(
  type: NitroCharacteristicSubscriptionType
): CharacteristicSubscriptionType {
  const mapping = {
    [NitroCharacteristicSubscriptionType.Notification]: 'notification' as const,
    [NitroCharacteristicSubscriptionType.Indication]: 'indication' as const,
  };
  return mapping[type] ?? 'notification';
}

export function refreshGattMomentToString(_moment: NitroRefreshGattMoment): RefreshGattMoment {
  return 'OnConnected'; // Only one value exists
}

// Conversion functions from react-native-ble-plx string enums/types to Nitro numeric enums
export function stringToState(stateString: State | string): NitroState {
  switch (stateString) {
    case State.Unknown:
    case 'Unknown':
      return NitroState.Unknown;
    case State.Resetting:
    case 'Resetting':
      return NitroState.Resetting;
    case State.Unsupported:
    case 'Unsupported':
      return NitroState.Unsupported;
    case State.Unauthorized:
    case 'Unauthorized':
      return NitroState.Unauthorized;
    case State.PoweredOff:
    case 'PoweredOff':
      return NitroState.PoweredOff;
    case State.PoweredOn:
    case 'PoweredOn':
      return NitroState.PoweredOn;
    default:
      return NitroState.Unknown;
  }
}

export function stringToLogLevel(logLevelString: LogLevel | string): NitroLogLevel {
  switch (logLevelString) {
    case LogLevel.None:
    case 'None':
      return NitroLogLevel.None;
    case LogLevel.Verbose:
    case 'Verbose':
      return NitroLogLevel.Verbose;
    case LogLevel.Debug:
    case 'Debug':
      return NitroLogLevel.Debug;
    case LogLevel.Info:
    case 'Info':
      return NitroLogLevel.Info;
    case LogLevel.Warning:
    case 'Warning':
      return NitroLogLevel.Warning;
    case LogLevel.Error:
    case 'Error':
      return NitroLogLevel.Error;
    default:
      return NitroLogLevel.None;
  }
}

export function stringToCharacteristicSubscriptionType(
  typeString: CharacteristicSubscriptionType | string
): NitroCharacteristicSubscriptionType {
  switch (typeString) {
    case 'notification':
      return NitroCharacteristicSubscriptionType.Notification;
    case 'indication':
      return NitroCharacteristicSubscriptionType.Indication;
    default:
      return NitroCharacteristicSubscriptionType.Notification;
  }
}

export function stringToRefreshGattMoment(_momentString: RefreshGattMoment): NitroRefreshGattMoment {
  return NitroRefreshGattMoment.OnConnected;
}

// Generic converter that handles both string and numeric enum values
export function normalizeState(state: NitroState | State | string): NitroState {
  if (typeof state === 'string') {
    return stringToState(state);
  }
  // If it's already a NitroState (numeric), return as-is
  if (typeof state === 'number') {
    return state as NitroState;
  }
  // If it's a string State enum value, convert it
  return stringToState(state as string);
}

export function normalizeLogLevel(logLevel: NitroLogLevel | LogLevel | string): NitroLogLevel {
  if (typeof logLevel === 'string') {
    return stringToLogLevel(logLevel);
  }
  // If it's already a NitroLogLevel (numeric), return as-is
  if (typeof logLevel === 'number') {
    return logLevel as NitroLogLevel;
  }
  // If it's a string LogLevel enum value, convert it
  return stringToLogLevel(logLevel as string);
}

export function normalizeCharacteristicSubscriptionType(
  type: NitroCharacteristicSubscriptionType | CharacteristicSubscriptionType | string
): NitroCharacteristicSubscriptionType {
  if (typeof type === 'string') {
    return stringToCharacteristicSubscriptionType(type);
  }
  // If it's already a NitroCharacteristicSubscriptionType (numeric), return as-is
  return type as NitroCharacteristicSubscriptionType;
}

export function normalizeRefreshGattMoment(
  _moment: NitroRefreshGattMoment | RefreshGattMoment | string
): NitroRefreshGattMoment {
  return NitroRefreshGattMoment.OnConnected; // Only one value exists
}

// Helper function to detect if a value is a string enum vs numeric enum
export function isStringEnumValue(value: any): boolean {
  return typeof value === 'string';
}