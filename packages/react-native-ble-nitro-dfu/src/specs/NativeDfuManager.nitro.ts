import { HybridObject } from 'react-native-nitro-modules';

// Nitro constraint: Use numeric enums instead of string unions
export enum DfuState {
  Idle = 0,
  Starting = 1,
  Connecting = 2,
  EnablingDfuMode = 3,
  Uploading = 4,
  Validating = 5,
  Disconnecting = 6,
  Completed = 7,
  Aborted = 8,
  Error = 9,
}

export enum DfuFirmwareType {
  Softdevice = 0,
  Bootloader = 1,
  Application = 2,
  SoftdeviceBootloader = 3,
  SoftdeviceBootloaderApplication = 4,
}

export enum DfuError {
  None = 0,
  FileNotSpecified = 1,
  FileInvalid = 2,
  RemoteLegacyDFUInvalidState = 3,
  RemoteLegacyDFUOperationFailed = 4,
  RemoteLegacyDFUDataExceedsLimit = 5,
  RemoteLegacyDFUCrcError = 6,
  RemoteLegacyDFUOperationNotPermitted = 7,
  RemoteSecureDFUInvalidObject = 8,
  RemoteSecureDFUSignatureMismatch = 9,
  RemoteSecureDFUUnsupportedType = 10,
  RemoteSecureDFUOperationNotPermitted = 11,
  RemoteSecureDFUOperationFailed = 12,
  RemoteSecureDFUExtendedError = 13,
  RemoteButtonlessInvalidState = 14,
  RemoteButtonlessOperationFailed = 15,
  RemoteButtonlessOperationNotSupported = 16,
  DeviceDisconnected = 17,
  BluetoothDisabled = 18,
  ServiceDiscoveryFailed = 19,
  DeviceNotSupported = 20,
  ReadingVersionFailed = 21,
  EnablingControlPointFailed = 22,
  WritingCharacteristicFailed = 23,
  ReceivingNotificationFailed = 24,
  UnsupportedResponse = 25,
  BytesLost = 26,
  CrcError = 27,
  InitPacketRequired = 28,
  Unknown = 99,
}

export interface DfuProgressInfo {
  percent: number;
  currentPart: number;
  totalParts: number;
  avgSpeed: number;
  currentSpeed: number;
}

export interface DfuServiceInitiatorOptions {
  packetReceiptNotificationParameter?: number;
  forceScanningForNewAddressInLegacyDfu?: boolean;
  disableResume?: boolean;
}

export type DfuProgressCallback = (
  deviceId: string,
  percent: number,
  currentPart: number,
  totalParts: number,
  avgSpeed: number,
  currentSpeed: number
) => void;

export type DfuStateCallback = (deviceId: string, state: DfuState) => void;

export type DfuErrorCallback = (
  deviceId: string,
  error: DfuError,
  errorType: number,
  message: string
) => void;

export type DfuCompletionCallback = (deviceId: string, success: boolean) => void;

/**
 * Native DFU Manager Specification
 * Defines the interface for Nordic DFU (Device Firmware Update) operations
 */
export interface NativeDfuManager extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Start DFU process on a connected device
   * @param deviceId The ID of the device to update
   * @param firmwareUri Path or URI to the firmware file (ZIP for iOS, can be BIN/HEX/ZIP for Android)
   * @param firmwareType Type of firmware to update
   * @param options Optional DFU configuration options
   * @param onProgress Callback for progress updates
   * @param onStateChanged Callback for state changes
   * @param onError Callback for errors
   * @param onCompleted Callback when DFU completes or fails
   */
  startDfu(
    deviceId: string,
    firmwareUri: string,
    firmwareType: DfuFirmwareType,
    options: DfuServiceInitiatorOptions,
    onProgress: DfuProgressCallback,
    onStateChanged: DfuStateCallback,
    onError: DfuErrorCallback,
    onCompleted: DfuCompletionCallback
  ): void;

  /**
   * Pause ongoing DFU process
   * @param deviceId The ID of the device
   * @returns true if paused successfully
   */
  pauseDfu(deviceId: string): boolean;

  /**
   * Resume paused DFU process
   * @param deviceId The ID of the device
   * @returns true if resumed successfully
   */
  resumeDfu(deviceId: string): boolean;

  /**
   * Abort ongoing DFU process
   * @param deviceId The ID of the device
   * @returns true if aborted successfully
   */
  abortDfu(deviceId: string): boolean;

  /**
   * Check if DFU is in progress for a device
   * @param deviceId The ID of the device
   * @returns true if DFU is ongoing
   */
  isDfuInProgress(deviceId: string): boolean;

  /**
   * Get current DFU state for a device
   * @param deviceId The ID of the device
   * @returns Current DFU state
   */
  getDfuState(deviceId: string): DfuState;
}
