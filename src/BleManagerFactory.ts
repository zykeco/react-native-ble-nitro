import { NitroModules } from 'react-native-nitro-modules';
import type { BleManager as BleManagerInterface } from './specs/BleManager.nitro.js';
import type { BleManagerOptions } from './specs/types.js';

/**
 * Creates a BleManager instance using Nitro Modules
 * This function maintains compatibility with react-native-ble-plx's BleManager constructor
 */
export function createBleManager(options?: BleManagerOptions): BleManagerInterface {
  const BleManagerModule = NitroModules.createHybridObject<BleManagerInterface>('BleManager');
  
  if (!BleManagerModule) {
    throw new Error(
      'Failed to create BleManager: Nitro module not found. ' +
      'Make sure react-native-ble-nitro is properly installed and linked.'
    );
  }

  // If options are provided, we could initialize with them
  // For now, we return the module directly as Nitro handles the native initialization
  return BleManagerModule;
}

/**
 * Legacy compatibility: Export a BleManager constructor function
 * This maintains compatibility with code that imports { BleManager } from 'react-native-ble-plx'
 */
export const BleManager = function(options?: BleManagerOptions): BleManagerInterface {
  return createBleManager(options);
} as any;