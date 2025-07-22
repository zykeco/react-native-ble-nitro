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
  normalizeCharacteristicSubscriptionType,
  State,
  LogLevel,
  type CharacteristicSubscriptionType
} from '../../compatibility/enums';
import { 
  State as NitroState, 
  LogLevel as NitroLogLevel, 
  CharacteristicSubscriptionType as NitroCharacteristicSubscriptionType 
} from '../../specs/types';

describe('State Enum Conversions', () => {
  describe('stateToString', () => {
    it('should convert numeric state values to strings', () => {
      expect(stateToString(NitroState.Unknown)).toBe(State.Unknown);
      expect(stateToString(NitroState.Resetting)).toBe(State.Resetting);
      expect(stateToString(NitroState.Unsupported)).toBe(State.Unsupported);
      expect(stateToString(NitroState.Unauthorized)).toBe(State.Unauthorized);
      expect(stateToString(NitroState.PoweredOff)).toBe(State.PoweredOff);
      expect(stateToString(NitroState.PoweredOn)).toBe(State.PoweredOn);
    });

    it('should handle invalid state values', () => {
      expect(stateToString(999 as NitroState)).toBe(State.Unknown);
      expect(stateToString(-1 as NitroState)).toBe(State.Unknown);
    });
  });

  describe('stringToState', () => {
    it('should convert string state values to numeric enums', () => {
      expect(stringToState('Unknown')).toBe(NitroState.Unknown);
      expect(stringToState('Resetting')).toBe(NitroState.Resetting);
      expect(stringToState('Unsupported')).toBe(NitroState.Unsupported);
      expect(stringToState('Unauthorized')).toBe(NitroState.Unauthorized);
      expect(stringToState('PoweredOff')).toBe(NitroState.PoweredOff);
      expect(stringToState('PoweredOn')).toBe(NitroState.PoweredOn);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToState('PoweredOn')).toBe(NitroState.PoweredOn);
      expect(stringToState('PoweredOff')).toBe(NitroState.PoweredOff);
      expect(stringToState('Unknown')).toBe(NitroState.Unknown);
    });

    it('should handle invalid string values', () => {
      expect(stringToState('InvalidState')).toBe(NitroState.Unknown);
      expect(stringToState('')).toBe(NitroState.Unknown);
      expect(stringToState('null')).toBe(NitroState.Unknown);
    });
  });

  describe('normalizeState', () => {
    it('should pass through numeric state values', () => {
      expect(normalizeState(NitroState.PoweredOn)).toBe(NitroState.PoweredOn);
      expect(normalizeState(NitroState.PoweredOff)).toBe(NitroState.PoweredOff);
    });

    it('should convert string state values to numeric', () => {
      expect(normalizeState('PoweredOn' as any)).toBe(NitroState.PoweredOn);
      expect(normalizeState('PoweredOff' as any)).toBe(NitroState.PoweredOff);
    });
  });
});

describe('LogLevel Enum Conversions', () => {
  describe('logLevelToString', () => {
    it('should convert numeric log level values to strings', () => {
      expect(logLevelToString(NitroLogLevel.None)).toBe(LogLevel.None);
      expect(logLevelToString(NitroLogLevel.Error)).toBe(LogLevel.Error);
      expect(logLevelToString(NitroLogLevel.Warning)).toBe(LogLevel.Warning);
      expect(logLevelToString(NitroLogLevel.Info)).toBe(LogLevel.Info);
      expect(logLevelToString(NitroLogLevel.Debug)).toBe(LogLevel.Debug);
      expect(logLevelToString(NitroLogLevel.Verbose)).toBe(LogLevel.Verbose);
    });

    it('should handle invalid log level values', () => {
      expect(logLevelToString(999 as NitroLogLevel)).toBe(LogLevel.None);
      expect(logLevelToString(-1 as NitroLogLevel)).toBe(LogLevel.None);
    });
  });

  describe('stringToLogLevel', () => {
    it('should convert string log level values to numeric enums', () => {
      expect(stringToLogLevel('None')).toBe(NitroLogLevel.None);
      expect(stringToLogLevel('Error')).toBe(NitroLogLevel.Error);
      expect(stringToLogLevel('Warning')).toBe(NitroLogLevel.Warning);
      expect(stringToLogLevel('Info')).toBe(NitroLogLevel.Info);
      expect(stringToLogLevel('Debug')).toBe(NitroLogLevel.Debug);
      expect(stringToLogLevel('Verbose')).toBe(NitroLogLevel.Verbose);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToLogLevel('Error')).toBe(NitroLogLevel.Error);
      expect(stringToLogLevel('Warning')).toBe(NitroLogLevel.Warning);
      expect(stringToLogLevel('Info')).toBe(NitroLogLevel.Info);
    });

    it('should handle invalid string values', () => {
      expect(stringToLogLevel('InvalidLevel')).toBe(NitroLogLevel.None);
      expect(stringToLogLevel('')).toBe(NitroLogLevel.None);
      expect(stringToLogLevel('trace')).toBe(NitroLogLevel.None);
    });
  });

  describe('normalizeLogLevel', () => {
    it('should pass through numeric log level values', () => {
      expect(normalizeLogLevel(NitroLogLevel.Debug)).toBe(NitroLogLevel.Debug);
      expect(normalizeLogLevel(NitroLogLevel.Error)).toBe(NitroLogLevel.Error);
    });

    it('should convert string log level values to numeric', () => {
      expect(normalizeLogLevel('Debug' as any)).toBe(NitroLogLevel.Debug);
      expect(normalizeLogLevel('Error' as any)).toBe(NitroLogLevel.Error);
    });
  });
});

describe('CharacteristicSubscriptionType Enum Conversions', () => {
  describe('characteristicSubscriptionTypeToString', () => {
    it('should convert numeric subscription type values to strings', () => {
      expect(characteristicSubscriptionTypeToString(NitroCharacteristicSubscriptionType.Notification)).toBe('notification');
      expect(characteristicSubscriptionTypeToString(NitroCharacteristicSubscriptionType.Indication)).toBe('indication');
    });

    it('should handle invalid subscription type values', () => {
      expect(characteristicSubscriptionTypeToString(999 as NitroCharacteristicSubscriptionType)).toBe('notification');
      expect(characteristicSubscriptionTypeToString(-1 as NitroCharacteristicSubscriptionType)).toBe('notification');
    });
  });

  describe('stringToCharacteristicSubscriptionType', () => {
    it('should convert string subscription type values to numeric enums', () => {
      expect(stringToCharacteristicSubscriptionType('notification')).toBe(NitroCharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('indication')).toBe(NitroCharacteristicSubscriptionType.Indication);
    });

    it('should handle case insensitive conversion', () => {
      expect(stringToCharacteristicSubscriptionType('notification')).toBe(NitroCharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('indication')).toBe(NitroCharacteristicSubscriptionType.Indication);
    });

    it('should handle invalid string values', () => {
      expect(stringToCharacteristicSubscriptionType('InvalidType')).toBe(NitroCharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('')).toBe(NitroCharacteristicSubscriptionType.Notification);
      expect(stringToCharacteristicSubscriptionType('subscribe')).toBe(NitroCharacteristicSubscriptionType.Notification);
    });
  });

  describe('normalizeCharacteristicSubscriptionType', () => {
    it('should pass through numeric subscription type values', () => {
      expect(normalizeCharacteristicSubscriptionType(NitroCharacteristicSubscriptionType.Indication)).toBe(NitroCharacteristicSubscriptionType.Indication);
      expect(normalizeCharacteristicSubscriptionType(NitroCharacteristicSubscriptionType.Notification)).toBe(NitroCharacteristicSubscriptionType.Notification);
    });

    it('should convert string subscription type values to numeric', () => {
      expect(normalizeCharacteristicSubscriptionType('indication' as any)).toBe(NitroCharacteristicSubscriptionType.Indication);
      expect(normalizeCharacteristicSubscriptionType('notification' as any)).toBe(NitroCharacteristicSubscriptionType.Notification);
    });

    it('should handle legacy string values from react-native-ble-plx', () => {
      expect(normalizeCharacteristicSubscriptionType('notification')).toBe(NitroCharacteristicSubscriptionType.Notification);
      expect(normalizeCharacteristicSubscriptionType('indication')).toBe(NitroCharacteristicSubscriptionType.Indication);
    });
  });
});

describe('Backward Compatibility', () => {
  it('should maintain compatibility with react-native-ble-plx string values', () => {
    // Test that the old string-based API still works through normalization
    const state1 = normalizeState('PoweredOn' as any);
    const state2 = normalizeState(NitroState.PoweredOn);
    expect(state1).toBe(state2);

    const logLevel1 = normalizeLogLevel('Debug' as any);
    const logLevel2 = normalizeLogLevel(NitroLogLevel.Debug);
    expect(logLevel1).toBe(logLevel2);

    const subscriptionType1 = normalizeCharacteristicSubscriptionType('notification');
    const subscriptionType2 = normalizeCharacteristicSubscriptionType(NitroCharacteristicSubscriptionType.Notification);
    expect(subscriptionType1).toBe(subscriptionType2);
  });

  it('should provide string representations for user-facing display', () => {
    // Test that numeric enums can be converted back to user-friendly strings
    expect(stateToString(NitroState.PoweredOn)).toBe(State.PoweredOn);
    expect(logLevelToString(NitroLogLevel.Debug)).toBe(LogLevel.Debug);
    expect(characteristicSubscriptionTypeToString(NitroCharacteristicSubscriptionType.Notification)).toBe('notification');
  });

  it('should handle edge cases gracefully', () => {
    // Test that invalid values don't crash and default to reasonable fallbacks
    expect(() => stateToString(999 as NitroState)).not.toThrow();
    expect(() => stringToState('invalid')).not.toThrow();
    expect(() => normalizeState(null as any)).not.toThrow();
    expect(() => normalizeLogLevel(undefined as any)).not.toThrow();
  });
});

describe('Enum Value Validation', () => {
  it('should have correct numeric enum values', () => {
    // Verify that our numeric enums match the expected values  
    expect(NitroState.Unknown).toBe(0);
    expect(NitroState.Resetting).toBe(1);
    expect(NitroState.Unsupported).toBe(2);
    expect(NitroState.Unauthorized).toBe(3);
    expect(NitroState.PoweredOff).toBe(4);
    expect(NitroState.PoweredOn).toBe(5);

    expect(NitroLogLevel.None).toBe(0);
    expect(NitroLogLevel.Verbose).toBe(1);
    expect(NitroLogLevel.Debug).toBe(2);
    expect(NitroLogLevel.Info).toBe(3);
    expect(NitroLogLevel.Warning).toBe(4);
    expect(NitroLogLevel.Error).toBe(5);

    expect(NitroCharacteristicSubscriptionType.Notification).toBe(0);
    expect(NitroCharacteristicSubscriptionType.Indication).toBe(1);

    // Verify that our string enums match the expected values
    expect(State.Unknown).toBe('Unknown');
    expect(LogLevel.Debug).toBe('Debug');
  });

  it('should provide complete bidirectional conversion coverage', () => {
    // Test that every enum value can be converted to string and back
    const states = [NitroState.Unknown, NitroState.Resetting, NitroState.Unsupported, NitroState.Unauthorized, NitroState.PoweredOff, NitroState.PoweredOn];
    
    states.forEach(state => {
      const stringValue = stateToString(state);
      const backToNumber = stringToState(stringValue);
      expect(backToNumber).toBe(state);
    });

    const logLevels = [NitroLogLevel.None, NitroLogLevel.Error, NitroLogLevel.Warning, NitroLogLevel.Info, NitroLogLevel.Debug, NitroLogLevel.Verbose];
    
    logLevels.forEach(level => {
      const stringValue = logLevelToString(level);
      const backToNumber = stringToLogLevel(stringValue);
      expect(backToNumber).toBe(level);
    });

    const subscriptionTypes = [NitroCharacteristicSubscriptionType.Notification, NitroCharacteristicSubscriptionType.Indication];
    
    subscriptionTypes.forEach(type => {
      const stringValue = characteristicSubscriptionTypeToString(type);
      const backToNumber = stringToCharacteristicSubscriptionType(stringValue);
      expect(backToNumber).toBe(type);
    });
  });
});