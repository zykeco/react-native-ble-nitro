import { ConfigPlugin } from '@expo/config-plugins';
import withBleNitro, { withBleNitroAndroid, withBleNitroIOS, type BleNitroPluginProps } from './withBleNitro';

/**
 * Expo Config Plugin for react-native-ble-nitro
 * 
 * Configures iOS and Android permissions and settings for BLE operations
 * 
 * @example
 * ```json
 * {
 *   "expo": {
 *     "plugins": [
 *       [
 *         "react-native-ble-nitro",
 *         {
 *           "isBackgroundEnabled": true,
 *           "modes": ["peripheral", "central"],
 *           "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
 *         }
 *       ]
 *     ]
 *   }
 * }
 * ```
 */
const plugin: ConfigPlugin<BleNitroPluginProps | void> = (config, props) => {
  return withBleNitro(config, props || {});
};

export default plugin;
export { withBleNitro, withBleNitroAndroid, withBleNitroIOS, type BleNitroPluginProps };