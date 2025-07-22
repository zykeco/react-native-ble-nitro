# API Differences: react-native-ble-nitro vs react-native-ble-plx

This document outlines the differences between `react-native-ble-nitro` and `react-native-ble-plx@3.5.0` due to Nitro Modules' type system constraints.

## Overview

While `react-native-ble-nitro` aims to be a 100% drop-in replacement for `react-native-ble-plx`, Nitro Modules has certain type system limitations that require some adaptations. These changes are designed to be transparent to end users through compatibility layers.

## Type System Changes

### 1. Enum Values (String → Number)

**Issue**: Nitro doesn't support string enum values, only numeric values.

#### State Enum
```typescript
// react-native-ble-plx (original)
export enum State {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn'
}

// react-native-ble-nitro (adapted)
export enum State {
  Unknown = 0,
  Resetting = 1,
  Unsupported = 2,
  Unauthorized = 3,
  PoweredOff = 4,
  PoweredOn = 5
}
```

#### LogLevel Enum
```typescript
// react-native-ble-plx (original)
export enum LogLevel {
  None = 'None',
  Verbose = 'Verbose',
  Debug = 'Debug',
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error'
}

// react-native-ble-nitro (adapted)
export enum LogLevel {
  None = 0,
  Verbose = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5
}
```

**Compatibility Solution**: 
- Native implementations will map numeric values back to expected string values
- TypeScript wrapper layer will provide string constants for backward compatibility

### 2. Union Types → Enums

**Issue**: Nitro doesn't support TypeScript union types; they must be converted to enums.

#### CharacteristicSubscriptionType
```typescript
// react-native-ble-plx (original)
export type CharacteristicSubscriptionType = 'notification' | 'indication';

// react-native-ble-nitro (adapted)
export enum CharacteristicSubscriptionType {
  Notification = 0,
  Indication = 1
}
```

#### RefreshGattMoment
```typescript
// react-native-ble-plx (original)
export type RefreshGattMoment = 'OnConnected';

// react-native-ble-nitro (adapted)
export enum RefreshGattMoment {
  OnConnected = 0
}
```

**Compatibility Solution**: 
- Wrapper functions will accept both string and enum values
- Automatic conversion in the compatibility layer

### 3. Index Signatures → Structured Types

**Issue**: Nitro doesn't support TypeScript index signatures like `{ [key: string]: value }`.

#### Service Data Structure
```typescript
// react-native-ble-plx (original)
interface NativeDevice {
  serviceData: { [uuid: string]: Base64 } | null;
}

// react-native-ble-nitro (adapted)
interface ServiceDataEntry {
  uuid: UUID;
  data: Base64;
}

interface NativeDevice {
  serviceData: ServiceDataEntry[] | null;
}
```

**Compatibility Solution**:
- Native code will convert between formats automatically
- JavaScript wrapper will provide the original `{ [uuid: string]: Base64 }` interface
- Conversion utilities: `arrayToServiceDataMap()` and `serviceDataMapToArray()`

### 4. Optional Parameter Handling

**Issue**: Nitro has limitations with optional parameters in certain contexts, especially with union types.

#### ConnectionOptions Interface
```typescript
// react-native-ble-plx (original)
export interface ConnectionOptions {
  autoConnect?: boolean;
  requestMTU?: number;
  refreshGatt?: RefreshGattMoment;  // Optional + union type = problem
  timeout?: number;
}

// react-native-ble-nitro (adapted)
export interface ConnectionOptions {
  autoConnect: boolean;
  requestMTU: number;
  timeout: number;
  // refreshGatt removed from interface, handled separately
}
```

**Compatibility Solution**:
- Wrapper layer will provide default values for required fields
- Optional parameters handled through method overloads
- Additional methods for complex optional parameters

### 5. Device Interface Property Conflicts

**Issue**: Nitro's `HybridObject` base interface has a `name` property that conflicts with BLE device names.

#### Device Interface
```typescript
// react-native-ble-plx (original)
interface Device {
  name: string | null;
  // ... other properties
}

// react-native-ble-nitro (adapted)
interface Device extends HybridObject {
  deviceName?: string | null;  // Renamed to avoid conflict
  // ... other properties
}
```

**Compatibility Solution**:
- Native implementation will populate both `name` and `deviceName`
- JavaScript wrapper will expose `name` property for compatibility
- Transparent mapping in the compatibility layer

## Compatibility Layer Implementation

### String Enum Mapping
```typescript
// Compatibility constants
export const StateString = {
  [State.Unknown]: 'Unknown',
  [State.Resetting]: 'Resetting',
  [State.Unsupported]: 'Unsupported',
  [State.Unauthorized]: 'Unauthorized',
  [State.PoweredOff]: 'PoweredOff',
  [State.PoweredOn]: 'PoweredOn'
} as const;

// Helper functions
export function stateToString(state: State): string {
  return StateString[state];
}

export function stringToState(stateString: string): State {
  return Object.entries(StateString).find(([_, str]) => str === stateString)?.[0] as unknown as State || State.Unknown;
}
```

### Service Data Conversion
```typescript
// Conversion utilities
export function serviceDataArrayToMap(entries: ServiceDataEntry[]): { [uuid: string]: Base64 } {
  const result: { [uuid: string]: Base64 } = {};
  entries.forEach(entry => {
    result[entry.uuid] = entry.data;
  });
  return result;
}

export function serviceDataMapToArray(map: { [uuid: string]: Base64 }): ServiceDataEntry[] {
  return Object.entries(map).map(([uuid, data]) => ({ uuid, data }));
}
```

### Device Wrapper
```typescript
class DeviceWrapper {
  constructor(private nativeDevice: NativeDevice) {}
  
  get name(): string | null {
    return this.nativeDevice.deviceName || null;
  }
  
  get serviceData(): { [uuid: string]: Base64 } | null {
    return this.nativeDevice.serviceData ? serviceDataArrayToMap(this.nativeDevice.serviceData) : null;
  }
  
  // ... other wrapped properties and methods
}
```

## Impact on End Users

### No Breaking Changes
- **API Surface**: Identical to react-native-ble-plx
- **Method Signatures**: Unchanged through wrapper layer
- **Return Types**: Maintained through transformation layer

### Performance Considerations
- **Minimal Overhead**: Conversions happen at the native boundary
- **Cached Conversions**: Frequently used transformations are cached
- **Nitro Benefits**: Overall performance improvement due to Nitro's JSI-based architecture

### Migration Path
```typescript
// No changes required - drop-in replacement
// Before (react-native-ble-plx)
import { BleManager, State } from 'react-native-ble-plx';

// After (react-native-ble-nitro)
import { BleManager, State } from 'react-native-ble-nitro';
// Everything works exactly the same!
```

## Development Considerations

### For Contributors
1. **Type Definitions**: Always use numeric enums in `.nitro.ts` files
2. **Interface Design**: Avoid index signatures and complex optional parameters
3. **Testing**: Ensure compatibility layer maintains 100% API compatibility
4. **Documentation**: Keep this document updated with any new limitations

### For Native Implementation
1. **String Mapping**: Native code must handle string ↔ number enum conversions
2. **Data Transformation**: Handle ServiceData array ↔ map conversions efficiently
3. **Property Mapping**: Ensure `deviceName` is properly exposed as `name`
4. **Error Handling**: Maintain original error codes and messages

## Future Considerations

### Potential Nitro Improvements
- **String Enum Support**: Would eliminate enum mapping overhead
- **Index Signature Support**: Would simplify service data handling
- **Advanced Union Types**: Would reduce compatibility layer complexity

### Backward Compatibility Promise
- **API Stability**: All changes remain internal to the library
- **Drop-in Replacement**: No user code changes required
- **Feature Parity**: 100% feature compatibility maintained
- **Performance**: Equal or better performance compared to original

---

*This document is maintained alongside the implementation to ensure transparency and guide development decisions.*