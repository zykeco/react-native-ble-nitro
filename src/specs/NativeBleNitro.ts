import { NitroModules } from 'react-native-nitro-modules';
import type { NativeBleNitro } from './NativeBleNitro.nitro';

// Export the native implementation
const NativeBleNitroImpl = NitroModules.createHybridObject<NativeBleNitro>('NativeBleNitro');

export default NativeBleNitroImpl;
export * from './NativeBleNitro.nitro';