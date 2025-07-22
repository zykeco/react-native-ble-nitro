# react-native-ble-nitro

This packages is intended to be a drop-in replacement for `react-native-ble-plx` with a focus on performance and stability.
It is built on top of the [Nitro Modules](https://nitro.margelo.com/) framework, which provides a more efficient way to handle native modules in React Native. The native part is written in Swift and Kotlin, ensuring high performance and reliability.

It is currently built to be used inside Expo Projects with React Native >= 0.76.x and Expo SDK >= 52.

## Expo SDK 52+

> Tested against Expo SDK 52
> This package cannot be used in the "Expo Go" app because [it requires custom native code](https://docs.expo.io/workflow/customizing/).
> First install the package with yarn, npm, or [`npx expo install`](https://docs.expo.io/workflow/expo-cli/#expo-install).

After installing this npm package, add the [config plugin](https://docs.expo.io/guides/config-plugins/) to the [`plugins`](https://docs.expo.io/versions/latest/config/app/#plugins) array of your `app.json` or `app.config.js`:

```
npx expo install react-native-ble-nitro
```

Then you should build the version using native modules (e.g. with `npx expo prebuild` command).
And install it directly into your device with `npx expo run:android`.

You can find more details in the ["Adding custom native code"](https://docs.expo.io/workflow/customizing/) guide.

```json
{
  "expo": {
    "plugins": ["react-native-ble-nitro"]
  }
}
```

### API

The plugin provides props for extra customization. Every time you change the props or plugins, you'll need to rebuild (and `prebuild`) the native app. If no extra properties are added, defaults will be used.

- `isBackgroundEnabled` (_boolean_): Enable background BLE support on Android. Adds `<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>` to the `AndroidManifest.xml`. Default `false`.
- `neverForLocation` (_boolean_): Set to true only if you can strongly assert that your app never derives physical location from Bluetooth scan results. The location permission will be still required on older Android devices. Note, that some BLE beacons are filtered from the scan results. Android SDK 31+. Default `false`. _WARNING: This parameter is experimental and BLE might not work. Make sure to test before releasing to production._
- `modes` (_string[]_): Adds iOS `UIBackgroundModes` to the `Info.plist`. Options are: `peripheral`, and `central`. Defaults to undefined.
- `bluetoothAlwaysPermission` (_string | false_): Sets the iOS `NSBluetoothAlwaysUsageDescription` permission message to the `Info.plist`. Setting `false` will skip adding the permission. Defaults to `Allow $(PRODUCT_NAME) to connect to bluetooth devices`.

#### Example

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "neverForLocation": true,
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ]
    ]
  }
}
```

## React Native CLI

Coming Soon.