import { NitroModules } from 'react-native-nitro-modules';
import type { NativeDfuManager } from './NativeDfuManager';
import type { NativeDfuManagerFactory as NativeDfuManagerFactorySpec } from './NativeDfuManagerFactory.nitro';

/**
 * Factory for creating DFU Manager instances
 */
const DfuNitroNativeFactory = NitroModules.createHybridObject<NativeDfuManagerFactorySpec>('DfuNitroManagerFactory');

export default DfuNitroNativeFactory;
export type { NativeDfuManager };
