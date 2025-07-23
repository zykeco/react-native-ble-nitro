import { NitroModules } from 'react-native-nitro-modules';
import type { BleManager as BleManagerInterface, BleManagerNitroOptions } from './specs/BleManager.nitro';
import type { BleManagerOptions } from './specs/types';

// Store callbacks that can't be passed to Nitro
const storedCallbacks = new WeakMap<BleManagerInterface, {
  restoreStateFunction?: (restoredState: any) => void;
  errorCodesToMessagesMapping?: { [key: number]: string };
}>();

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

  // Initialize with options if provided
  if (options) {
    // Extract Nitro-compatible options
    const nitroOptions: BleManagerNitroOptions = {
      restoreStateIdentifier: options.restoreStateIdentifier,
    };

    // Store callbacks and mappings that can't be passed to Nitro
    if (options.restoreStateFunction || options.errorCodesToMessagesMapping) {
      storedCallbacks.set(BleManagerModule, {
        restoreStateFunction: options.restoreStateFunction,
        errorCodesToMessagesMapping: options.errorCodesToMessagesMapping,
      });
    }

    // Note: initialize() is async but we need to maintain sync compatibility with react-native-ble-plx
    // The initialization will happen asynchronously in the background
    BleManagerModule.initialize(nitroOptions).then(async () => {
      // Check for restored state and call the callback if available
      if (options.restoreStateFunction) {
        try {
          const restoredState = await BleManagerModule.getRestoredState();
          if (restoredState) {
            options.restoreStateFunction(restoredState);
          }
        } catch (error) {
          console.warn('BleManager restore state callback failed:', error);
        }
      }
    }).catch(error => {
      console.warn('BleManager initialization failed:', error);
    });
  }

  return BleManagerModule;
}

/**
 * Helper function to retrieve stored callbacks for a BleManager instance
 * This is used internally when callbacks need to be invoked
 */
export function getStoredCallbacks(manager: BleManagerInterface) {
  return storedCallbacks.get(manager);
}

/**
 * Helper function to get custom error message if available
 * @param manager The BleManager instance
 * @param errorCode The BLE error code
 * @param defaultMessage Default error message
 * @returns Custom message if available, otherwise default message
 */
export function getCustomErrorMessage(
  manager: BleManagerInterface,
  errorCode: number,
  defaultMessage: string
): string {
  const callbacks = storedCallbacks.get(manager);
  const customMessage = callbacks?.errorCodesToMessagesMapping?.[errorCode];
  return customMessage || defaultMessage;
}

/**
 * Legacy compatibility: Export a BleManager constructor function
 * This maintains compatibility with code that imports { BleManager } from 'react-native-ble-plx'
 */
export const BleManager = function(options?: BleManagerOptions): BleManagerInterface {
  return createBleManager(options);
} as (options?: BleManagerOptions) => BleManagerInterface;