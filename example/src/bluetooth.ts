import { BleNitro, BLEState } from 'react-native-ble-nitro';

const ble = BleNitro.instance();
ble.onRestoredState((peripherals) => {
  console.log('Restore State', peripherals);
})

export function createBle(opts: {
  onEnabledChange?: (enabled: boolean) => void;
}) {
  return {
    mount: () => {
      const state = ble.state();
      console.log('Initial State', state);
      const subState = () => ble.subscribeToStateChange((state: BLEState) => {
        opts.onEnabledChange?.(state === BLEState.PoweredOn);
        console.log('State Changed', state);
      }, true);
      let stateSub = subState();
      stateSub.remove();
      console.log('State Sub Removed');
      stateSub = subState(); 
      return {
        stateSub,
      }
    },
    instance: ble,
    checkSum: (data: number[]): number => {
      let result = 0;
      for (const item of data) {
        result += item;
      }
      return (-result ^ 58) & 0xff;
    },
    HexUtil: {
      compose(...bytes: number[]): number[] {
        return bytes.map((b) => b & 0xff);
      },

      append(source: number[], dest: number | number[]): number[] {
        const destArray = Array.isArray(dest) ? dest : [dest];
        return [...source, ...destArray];
      },

      bytesToHex(bytes: number[]): string {
        return bytes.map((b) => ((b & 0xff) >>> 0).toString(16).padStart(2, '0')).join('');
      },

      hexToBytes(hex: string): number[] {
        const bytes: number[] = [];
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return bytes;
      },
    },
    buildCommand(cmd: number, ...values: number[]) {
      let result: number[];

      console.log('Build Command', cmd, values);

      const { HexUtil } = this;

      if (values && values.length > 0) {
        const len = values.length + 4;
        const header = HexUtil.compose(0xff, len, cmd);
        const bytes = HexUtil.compose(...values);
        result = HexUtil.append(header, bytes);
      } else {
        result = HexUtil.compose(0xff, 4, cmd);
      }

      const checksum = this.checkSum(result);
      const command = HexUtil.append(result, checksum);
      return command;
    },
  };
}