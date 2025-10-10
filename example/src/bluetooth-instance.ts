import { BleNitroManager } from "react-native-ble-nitro/manager";

export const ble = new BleNitroManager({
  restoreIdentifier: 'ble-nitro-example',
  onRestoredState: (peripherals) => {
    console.log('Restore State', peripherals);
  }
});