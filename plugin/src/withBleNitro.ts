import {
  AndroidConfig,
  ConfigPlugin,
  WarningAggregator,
  withAndroidManifest,
  withInfoPlist,
} from '@expo/config-plugins';

export interface BleNitroPluginProps {
  /**
   * Enable background BLE support on Android.
   * Adds required permissions and features to AndroidManifest.xml
   * @default false
   */
  isBackgroundEnabled?: boolean;

  /**
   * Set to true only if you can strongly assert that your app never derives 
   * physical location from Bluetooth scan results. The location permission 
   * will still be required on older Android devices.
   * @default false
   * @warning This parameter is experimental and BLE might not work. Test before releasing.
   */
  neverForLocation?: boolean;

  /**
   * iOS background modes for BLE operations
   * @default undefined
   */
  modes?: ('peripheral' | 'central')[];

  /**
   * iOS Bluetooth permission message. Set to false to skip adding the permission.
   * @default "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
   */
  bluetoothAlwaysPermission?: string | false;
}

const BLUETOOTH_PERMISSIONS = [
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_ADMIN',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
];

const BLUETOOTH_PERMISSIONS_API_31 = [
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
];

export const withBleNitroAndroid: ConfigPlugin<BleNitroPluginProps> = (config, props = {}) => {
  const { isBackgroundEnabled = false, neverForLocation = false } = props;

  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // Add required permissions
    AndroidConfig.Permissions.ensurePermissions(config.modResults, [
      ...BLUETOOTH_PERMISSIONS,
      ...BLUETOOTH_PERMISSIONS_API_31,
    ]);

    // Add uses-feature for BLE
    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    const usesFeatures = androidManifest.manifest['uses-feature'];
    
    // Add BLE feature requirement
    const bleFeature = {
      $: {
        'android:name': 'android.hardware.bluetooth_le',
        'android:required': (isBackgroundEnabled ? 'true' : 'false') as any,
      },
    };

    if (!usesFeatures.find((f: any) => f.$?.['android:name'] === 'android.hardware.bluetooth_le')) {
      usesFeatures.push(bleFeature);
    }

    // Handle location permission settings for Android 12+
    if (neverForLocation) {
      // Add neverForLocation attribute to location permissions for Android 12+
      const permissions = androidManifest.manifest['uses-permission'] || [];
      
      permissions.forEach((permission: any) => {
        if (
          permission.$?.['android:name'] === 'android.permission.ACCESS_FINE_LOCATION' ||
          permission.$?.['android:name'] === 'android.permission.ACCESS_COARSE_LOCATION'
        ) {
          permission.$['android:usesPermissionFlags'] = 'neverForLocation';
        }
      });
    }

    return config;
  });
};

export const withBleNitroIOS: ConfigPlugin<BleNitroPluginProps> = (config, props = {}) => {
  const { 
    modes, 
    bluetoothAlwaysPermission = 'Allow $(PRODUCT_NAME) to connect to bluetooth devices' 
  } = props;

  return withInfoPlist(config, (config) => {
    // Add NSBluetoothAlwaysUsageDescription
    if (bluetoothAlwaysPermission !== false) {
      config.modResults.NSBluetoothAlwaysUsageDescription = bluetoothAlwaysPermission;
    }

    // Add background modes if specified
    if (modes && modes.length > 0) {
      const backgroundModes = modes.map(mode => `bluetooth-${mode}`);
      
      if (!config.modResults.UIBackgroundModes) {
        config.modResults.UIBackgroundModes = [];
      }
      
      backgroundModes.forEach(mode => {
        if (!config.modResults.UIBackgroundModes!.includes(mode)) {
          config.modResults.UIBackgroundModes!.push(mode);
        }
      });
    }

    return config;
  });
};

const withBleNitro: ConfigPlugin<BleNitroPluginProps> = (config, props = {}) => {
  // Validate props
  if (props.neverForLocation && !props.isBackgroundEnabled) {
    WarningAggregator.addWarningForPlatform(
      'android',
      'react-native-ble-nitro',
      'neverForLocation is set to true but isBackgroundEnabled is false. ' +
      'This might cause issues with BLE scanning on some Android devices.'
    );
  }

  if (props.modes && props.modes.some(mode => !['peripheral', 'central'].includes(mode))) {
    WarningAggregator.addWarningForPlatform(
      'ios',
      'react-native-ble-nitro',
      'Invalid background mode specified. Only "peripheral" and "central" are supported.'
    );
  }

  // Apply platform-specific configurations
  config = withBleNitroAndroid(config, props);
  config = withBleNitroIOS(config, props);

  return config;
};

export default withBleNitro;