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
  type AsyncSubscription,
  type BleNitroManagerOptions,
  BLEState,
  AndroidScanMode,
  BleNitroManager,
  BleTimeoutError,
} from "./manager";

export { BleNitro } from './singleton';