/**
 * enums.test.ts
 * React Native BLE Nitro - Enum Conversion Tests
 * Copyright © 2025 Zyke (https://zyke.co)
 */

import {
  stateToString,
  stringToState,
  logLevelToString,
  stringToLogLevel,
  characteristicSubscriptionTypeToString,
  stringToCharacteristicSubscriptionType,
  normalizeState,
  normalizeLogLevel,
  normalizeCharacteristicSubscriptionType
} from '../../compatibility/enums';
import { State, LogLevel, CharacteristicSubscriptionType } from '../../specs/types';

describe('State Enum Conversions', () => {
  describe('stateToString', () => {
    it('should convert numeric state values to strings', () => {
      expect(stateToString(State.Unknown)).toBe('Unknown');
      expect(stateToString(State.Resetting)).toBe('Resetting');
      expect(stateToString(State.Unsupported)).toBe('Unsupported');
      expect(stateToString(State.Unauthorized)).toBe('Unauthorized');
      expect(stateToString(State.PoweredOff)).toBe('PoweredOff');
      expect(stateToString(State.PoweredOn)).toBe('PoweredOn');
    });

    it('should handle invalid state values', () => {
      expect(stateToString(999 as State)).toBe('Unknown');
      expect(stateToString(-1 as State)).toBe('Unknown');
    });
  });

  describe('stringToState', () => {
    it('should convert string state values to numeric enums', () => {
      expect(stringToState('Unknown')).toBe(State.Unknown);
      expect(stringToState('Resetting')).toBe(State.Resetting);
      expect(stringToState('Unsupported')).toBe(State.Unsupported);
      expect(stringToState('Unauthorized')).toBe(State.Unauthorized);
      expect(stringToState('PoweredOff')).toBe(State.PoweredOff);
      expect(stringToState('PoweredOn')).toBe(State.PoweredOn);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToState('poweredon')).toBe(State.PoweredOn);
      expect(stringToState('POWEREDOFF')).toBe(State.PoweredOff);
      expect(stringToState('UnKnOwN')).toBe(State.Unknown);
    });

    it('should handle invalid string values', () => {
      expect(stringToState('InvalidState')).toBe(State.Unknown);
      expect(stringToState('')).toBe(State.Unknown);
      expect(stringToState('null')).toBe(State.Unknown);
    });
  });

  describe('normalizeState', () => {
    it('should pass through numeric state values', () => {
      expect(normalizeState(State.PoweredOn)).toBe(State.PoweredOn);
      expect(normalizeState(State.PoweredOff)).toBe(State.PoweredOff);
    });

    it('should convert string state values to numeric', () => {
      expect(normalizeState('PoweredOn' as any)).toBe(State.PoweredOn);
      expect(normalizeState('PoweredOff' as any)).toBe(State.PoweredOff);
    });
  });
});

describe('LogLevel Enum Conversions', () => {
  describe('logLevelToString', () => {
    it('should convert numeric log level values to strings', () => {
      expect(logLevelToString(LogLevel.None)).toBe('None');
      expect(logLevelToString(LogLevel.Error)).toBe('Error');
      expect(logLevelToString(LogLevel.Warning)).toBe('Warning');
      expect(logLevelToString(LogLevel.Info)).toBe('Info');
      expect(logLevelToString(LogLevel.Debug)).toBe('Debug');
      expect(logLevelToString(LogLevel.Verbose)).toBe('Verbose');
    });

    it('should handle invalid log level values', () => {
      expect(logLevelToString(999 as LogLevel)).toBe('None');
      expect(logLevelToString(-1 as LogLevel)).toBe('None');
    });
  });

  describe('stringToLogLevel', () => {
    it('should convert string log level values to numeric enums', () => {
      expect(stringToLogLevel('None')).toBe(LogLevel.None);
      expect(stringToLogLevel('Error')).toBe(LogLevel.Error);
      expect(stringToLogLevel('Warning')).toBe(LogLevel.Warning);
      expect(stringToLogLevel('Info')).toBe(LogLevel.Info);
      expect(stringToLogLevel('Debug')).toBe(LogLevel.Debug);
      expect(stringToLogLevel('Verbose')).toBe(LogLevel.Verbose);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToLogLevel('error')).toBe(LogLevel.Error);
      expect(stringToLogLevel('WARNING')).toBe(LogLevel.Warning);
      expect(stringToLogLevel('InFo')).toBe(LogLevel.Info);
    });

    it('should handle invalid string values', () => {
      expect(stringToLogLevel('InvalidLevel')).toBe(LogLevel.None);
      expect(stringToLogLevel('')).toBe(LogLevel.None);
      expect(stringToLogLevel('trace')).toBe(LogLevel.None);
    });
  });

  describe('normalizeLogLevel', () => {
    it('should pass through numeric log level values', () => {
      expect(normalizeLogLevel(LogLevel.Debug)).toBe(LogLevel.Debug);
      expect(normalizeLogLevel(LogLevel.Error)).toBe(LogLevel.Error);
    });

    it('should convert string log level values to numeric', () => {
      expect(normalizeLogLevel('Debug' as any)).toBe(LogLevel.Debug);
      expect(normalizeLogLevel('Error' as any)).toBe(LogLevel.Error);
    });
  });
});

describe('CharacteristicSubscriptionType Enum Conversions', () => {
  describe('characteristicSubscriptionTypeToString', () => {
    it('should convert numeric subscription type values to strings', () => {
      expect(characteristicSubscriptionTypeToString(CharacteristicSubscriptionType.Notification)).toBe('notification');
      expect(characteristicSubscriptionTypeToString(CharacteristicSubscriptionType.Indication)).toBe('indication');
    });

    it('should handle invalid subscription type values', () => {
      expect(characteristicSubscriptionTypeToString(999 as CharacteristicSubscriptionType)).toBe('notification');
      expect(characteristicSubscriptionTypeToString(-1 as CharacteristicSubscriptionType)).toBe('notification');
    });
  });

  describe('stringToCharacteristicSubscriptionType', () => {
    it('should convert string subscription type values to numeric enums', () => {
      expect(stringToCharacteristicSubscriptionType('Notification')).toBe(CharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('Indication')).toBe(CharacteristicSubscriptionType.Indication);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToCharacteristicSubscriptionType('notification')).toBe(CharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('INDICATION')).toBe(CharacteristicSubscriptionType.Indication);
    });

    it('should handle invalid string values', () => {
      expect(stringToCharacteristicSubscriptionType('InvalidType')).toBe(CharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('')).toBe(CharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('subscribe')).toBe(CharacteristicSubscriptionType.Notification);
    });
  });

  describe('normalizeCharacteristicSubscriptionType', () => {
    it('should pass through numeric subscription type values', () => {
      expect(normalizeCharacteristicSubscriptionType(CharacteristicSubscriptionType.Indication)).toBe(CharacteristicSubscriptionType.Indication);
      expect(normalizeCharacteristicSubscriptionType(CharacteristicSubscriptionType.Notification)).toBe(CharacteristicSubscriptionType.Notification);
    });

    it('should convert string subscription type values to numeric', () => {
      expect(normalizeCharacteristicSubscriptionType('Indication' as any)).toBe(CharacteristicSubscriptionType.Indication);
      expect(normalizeCharacteristicSubscriptionType('Notification' as any)).toBe(CharacteristicSubscriptionType.Notification);
    });

    it('should handle legacy string values from react-native-ble-plx', () => {
      expect(normalizeCharacteristicSubscriptionType('notification')).toBe(CharacteristicSubscriptionType.Notification);
      expect(normalizeCharacteristicSubscriptionType('indication')).toBe(CharacteristicSubscriptionType.Indication);
    });
  });
});

describe('Backward Compatibility', () => {
  it('should maintain compatibility with react-native-ble-plx string values', () => {
    // Test that the old string-based API still works through normalization
    const state1 = normalizeState('PoweredOn' as any);
    const state2 = normalizeState(State.PoweredOn);
    expect(state1).toBe(state2);

    const logLevel1 = normalizeLogLevel('Debug' as any);
    const logLevel2 = normalizeLogLevel(LogLevel.Debug);
    expect(logLevel1).toBe(logLevel2);

    const subscriptionType1 = normalizeCharacteristicSubscriptionType('notification');
    const subscriptionType2 = normalizeCharacteristicSubscriptionType(CharacteristicSubscriptionType.Notification);
    expect(subscriptionType1).toBe(subscriptionType2);
  });

  it('should provide string representations for user-facing display', () => {
    // Test that numeric enums can be converted back to user-friendly strings
    expect(stateToString(State.PoweredOn)).toBe('PoweredOn');
    expect(logLevelToString(LogLevel.Debug)).toBe('Debug');
    expect(characteristicSubscriptionTypeToString(CharacteristicSubscriptionType.Notification)).toBe('notification');
  });

  it('should handle edge cases gracefully', () => {
    // Test that invalid values don't crash and default to reasonable fallbacks
    expect(() => stateToString(999 as State)).not.toThrow();
    expect(() => stringToState('invalid')).not.toThrow();
    expect(() => normalizeState(null as any)).not.toThrow();
    expect(() => normalizeLogLevel(undefined as any)).not.toThrow();
  });
});

describe('Enum Value Validation', () => {
  it('should have correct numeric enum values', () => {
    // Verify that our numeric enums match the expected values
    expect(State.Unknown).toBe(0);
    expect(State.Resetting).toBe(1);
    expect(State.Unsupported).toBe(2);
    expect(State.Unauthorized).toBe(3);
    expect(State.PoweredOff).toBe(4);
    expect(State.PoweredOn).toBe(5);

    expect(LogLevel.None).toBe(0);
    expect(LogLevel.Verbose).toBe(1);
    expect(LogLevel.Debug).toBe(2);
    expect(LogLevel.Info).toBe(3);
    expect(LogLevel.Warning).toBe(4);
    expect(LogLevel.Error).toBe(5);

    expect(CharacteristicSubscriptionType.Notification).toBe(0);
    expect(CharacteristicSubscriptionType.Indication).toBe(1);
  });

  it('should provide complete bidirectional conversion coverage', () => {
    // Test that every enum value can be converted to string and back
    const states = [State.Unknown, State.Resetting, State.Unsupported, State.Unauthorized, State.PoweredOff, State.PoweredOn];
    
    states.forEach(state => {
      const stringValue = stateToString(state);
      const backToNumber = stringToState(stringValue);
      expect(backToNumber).toBe(state);
    });

    const logLevels = [LogLevel.None, LogLevel.Error, LogLevel.Warning, LogLevel.Info, LogLevel.Debug, LogLevel.Verbose];
    
    logLevels.forEach(level => {
      const stringValue = logLevelToString(level);
      const backToNumber = stringToLogLevel(stringValue);
      expect(backToNumber).toBe(level);
    });

    const subscriptionTypes = [CharacteristicSubscriptionType.Notification, CharacteristicSubscriptionType.Indication];
    
    subscriptionTypes.forEach(type => {
      const stringValue = characteristicSubscriptionTypeToString(type);
      const backToNumber = stringToCharacteristicSubscriptionType(stringValue);
      expect(backToNumber).toBe(type);
    });
  });
});