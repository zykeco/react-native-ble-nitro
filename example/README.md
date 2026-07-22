# React Native BLE Nitro Example

## Getting started

```bash
# From the repository root
cd example
npm ci
npx expo prebuild --clean

# BLE peripheral mode requires a real device
npm run ios -- --device "Your Device Name"
npm run android
```

The example depends on the repository through `file:..`. Its npm and Metro
configuration keep JavaScript and native development pointed at the local
library source. `app.json` is the source of truth for native Bluetooth
configuration, so regenerate the native projects after changing it.

## Two-phone GATT server test

1. On the first phone, open the **Peripheral** tab, choose the notify/indicate
   and write behavior, then start the GATT server.
2. On the second phone, open the **Central** tab and choose **BLE Nitro Peripheral
   service** as the scan UUID. If an iOS peripheral is not listed on Android,
   choose **No service filter**; CoreBluetooth may place custom service UUIDs in
   an iOS-only overflow area.
3. Connect to the first phone, open **Manual characteristic test**, and select
   the **BLE Nitro Peripheral** preset to load the matching service, read, and write
   UUIDs.

The central fields remain editable and also list services and characteristics
discovered from the connected device.
