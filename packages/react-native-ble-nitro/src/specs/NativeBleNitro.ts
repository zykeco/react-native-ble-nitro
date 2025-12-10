import { NitroModules } from 'react-native-nitro-modules';
import { NativeBleNitro } from './NativeBleNitro.nitro';

// Export the native implementation
const NativeBleNitroImpl = NitroModules.createHybridObject<NativeBleNitro>('NativeBleNitro');

// export default NativeBleNitroImpl;
export default NativeBleNitroImpl;
export * from './NativeBleNitro.nitro';