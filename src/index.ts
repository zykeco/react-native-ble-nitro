export {
  type ByteArray,
  type ScanFilter,
  type BLEDevice,
  type ScanCallback,
  type ManufacturerDataEntry,
  type ManufacturerData,
  type ServiceDataEntry,
  type ServiceData,
  type ConnectionCallback,
  type DisconnectEventCallback,
  type OperationCallback,
  type CharacteristicUpdateCallback,
  type Subscription,
  type AsyncSubscription,
  type BleNitroManagerOptions,
  BLEState,
  AndroidScanMode,
  AndroidConnectionPriority,
  BleNitroManager,
} from "./manager";

export {
  BleErrorBase,
  BlePlatformError,
  BleNitroError,
  BleTimeoutError,
  BleNitroLibraryErrorCode,
  BLE_NITRO_LIBRARY_DOMAIN,
} from './errors';

export { type BLENativeError } from './specs/NativeBleNitro';

export { BleNitro } from './singleton';