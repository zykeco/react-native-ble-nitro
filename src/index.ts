import { BleNitroManager } from "./manager";

export {
  type ByteArray,
  type ScanFilter,
  type BLEDevice,
  type ScanCallback,
  type ManufacturerDataEntry,
  type ManufacturerData,
  type ConnectionCallback,
  type DisconnectEventCallback,
  type OperationCallback,
  type CharacteristicUpdateCallback,
  type Subscription,
  type BleNitroManager,
  type BleNitroManagerOptions,
  BLEState,
  AndroidScanMode,
} from "./manager";

let _instance: BleNitroManager;

export class BleNitro extends BleNitroManager {
  public static instance() {
    if (!_instance) {
      _instance = new BleNitro();
    }
    return _instance;
  }
}
