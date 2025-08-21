import { BleNitro, BLEState } from 'react-native-ble-nitro';

const ble = BleNitro.instance();

export function createBle(opts: {
  onEnabledChange?: (enabled: boolean) => void;
}) {
  return {
    mount: async () => {
      const state = await ble.state();
      opts.onEnabledChange?.(state === BLEState.PoweredOn);
      ble.subscribeToStateChange((state: BLEState) => {
        opts.onEnabledChange?.(state === BLEState.PoweredOn);
      });
    },
    instance: ble,
  };
}