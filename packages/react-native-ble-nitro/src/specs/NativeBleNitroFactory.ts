import { NitroModules } from 'react-native-nitro-modules';
import { NativeBleNitroFactory } from './NativeBleNitroFactory.nitro';

// Export the native implementation
const NativeBleNitroFactoryImpl = NitroModules.createHybridObject<NativeBleNitroFactory>('NativeBleNitroFactory');

// export default NativeBleNitroImpl;
export default NativeBleNitroFactoryImpl;
export * from './NativeBleNitro.nitro';