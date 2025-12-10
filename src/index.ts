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
} from "./manager";

export { BleNitro } from './singleton';

// DFU (Device Firmware Update) exports
export {
  type DfuProgressInfo,
  type DfuServiceInitiatorOptions,
  type DfuProgressCallback,
  type DfuStateCallback,
  type DfuErrorCallback,
  type DfuCompletionCallback,
  DfuState,
  DfuFirmwareType,
  DfuError,
  DfuManager,
} from './dfu-manager';

export { DfuNitro } from './dfu-singleton';