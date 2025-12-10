import { HybridObject } from 'react-native-nitro-modules';
import type { NativeDfuManager } from './NativeDfuManager';

/**
 * Factory interface for creating NativeDfuManager instances
 */
export interface NativeDfuManagerFactory extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Create a new DFU Manager instance
   * @returns A new NativeDfuManager instance
   */
  create(): NativeDfuManager;
}
