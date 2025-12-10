import DfuNitroNativeFactory, { NativeDfuManager } from './specs/NativeDfuManagerFactory';
import {
  DfuState as NativeDfuState,
  DfuFirmwareType as NativeDfuFirmwareType,
  DfuError as NativeDfuError,
  DfuProgressCallback as NativeDfuProgressCallback,
  DfuStateCallback as NativeDfuStateCallback,
  DfuErrorCallback as NativeDfuErrorCallback,
  DfuCompletionCallback as NativeDfuCompletionCallback,
  DfuServiceInitiatorOptions as NativeDfuServiceInitiatorOptions,
} from './specs/NativeDfuManager';

/**
 * DFU State - String enum for better developer experience
 */
export enum DfuState {
  Idle = 'Idle',
  Starting = 'Starting',
  Connecting = 'Connecting',
  EnablingDfuMode = 'EnablingDfuMode',
  Uploading = 'Uploading',
  Validating = 'Validating',
  Disconnecting = 'Disconnecting',
  Completed = 'Completed',
  Aborted = 'Aborted',
  Error = 'Error',
}

/**
 * DFU Firmware Type - Specifies what component(s) to update
 */
export enum DfuFirmwareType {
  Softdevice = 'Softdevice',
  Bootloader = 'Bootloader',
  Application = 'Application',
  SoftdeviceBootloader = 'SoftdeviceBootloader',
  SoftdeviceBootloaderApplication = 'SoftdeviceBootloaderApplication',
}

/**
 * DFU Error codes
 */
export enum DfuError {
  None = 'None',
  FileNotSpecified = 'FileNotSpecified',
  FileInvalid = 'FileInvalid',
  RemoteLegacyDFUInvalidState = 'RemoteLegacyDFUInvalidState',
  RemoteLegacyDFUOperationFailed = 'RemoteLegacyDFUOperationFailed',
  RemoteLegacyDFUDataExceedsLimit = 'RemoteLegacyDFUDataExceedsLimit',
  RemoteLegacyDFUCrcError = 'RemoteLegacyDFUCrcError',
  RemoteLegacyDFUOperationNotPermitted = 'RemoteLegacyDFUOperationNotPermitted',
  RemoteSecureDFUInvalidObject = 'RemoteSecureDFUInvalidObject',
  RemoteSecureDFUSignatureMismatch = 'RemoteSecureDFUSignatureMismatch',
  RemoteSecureDFUUnsupportedType = 'RemoteSecureDFUUnsupportedType',
  RemoteSecureDFUOperationNotPermitted = 'RemoteSecureDFUOperationNotPermitted',
  RemoteSecureDFUOperationFailed = 'RemoteSecureDFUOperationFailed',
  RemoteSecureDFUExtendedError = 'RemoteSecureDFUExtendedError',
  RemoteButtonlessInvalidState = 'RemoteButtonlessInvalidState',
  RemoteButtonlessOperationFailed = 'RemoteButtonlessOperationFailed',
  RemoteButtonlessOperationNotSupported = 'RemoteButtonlessOperationNotSupported',
  DeviceDisconnected = 'DeviceDisconnected',
  BluetoothDisabled = 'BluetoothDisabled',
  ServiceDiscoveryFailed = 'ServiceDiscoveryFailed',
  DeviceNotSupported = 'DeviceNotSupported',
  ReadingVersionFailed = 'ReadingVersionFailed',
  EnablingControlPointFailed = 'EnablingControlPointFailed',
  WritingCharacteristicFailed = 'WritingCharacteristicFailed',
  ReceivingNotificationFailed = 'ReceivingNotificationFailed',
  UnsupportedResponse = 'UnsupportedResponse',
  BytesLost = 'BytesLost',
  CrcError = 'CrcError',
  InitPacketRequired = 'InitPacketRequired',
  Unknown = 'Unknown',
}

/**
 * Progress information for DFU operation
 */
export interface DfuProgressInfo {
  /** Progress percentage (0-100) */
  percent: number;
  /** Current part being uploaded */
  currentPart: number;
  /** Total parts to upload */
  totalParts: number;
  /** Average upload speed in bytes/second */
  avgSpeed: number;
  /** Current upload speed in bytes/second */
  currentSpeed: number;
}

/**
 * Options for DFU service initiator
 */
export interface DfuServiceInitiatorOptions {
  /**
   * Number of packets of firmware data to be received before sending
   * a new Packet Receipt Notification. Default is 12.
   * Set to 0 to disable PRNs (not recommended on iOS).
   */
  packetReceiptNotificationParameter?: number;

  /**
   * (Legacy DFU only) Force scanning for new device address after
   * bootloader mode is enabled. Default is false.
   */
  forceScanningForNewAddressInLegacyDfu?: boolean;

  /**
   * Disable resume capability. When disabled, the DFU will always
   * start from the beginning. Default is false.
   */
  disableResume?: boolean;
}

/**
 * Callback for DFU progress updates
 */
export type DfuProgressCallback = (
  deviceId: string,
  progress: DfuProgressInfo
) => void;

/**
 * Callback for DFU state changes
 */
export type DfuStateCallback = (deviceId: string, state: DfuState) => void;

/**
 * Callback for DFU errors
 */
export type DfuErrorCallback = (
  deviceId: string,
  error: DfuError,
  errorType: number,
  message: string
) => void;

/**
 * Callback for DFU completion
 */
export type DfuCompletionCallback = (deviceId: string, success: boolean) => void;

// Mapping functions between TypeScript and Native enums
export function mapNativeDfuStateToDfuState(nativeState: NativeDfuState): DfuState {
  const map: Record<NativeDfuState, DfuState> = {
    [NativeDfuState.Idle]: DfuState.Idle,
    [NativeDfuState.Starting]: DfuState.Starting,
    [NativeDfuState.Connecting]: DfuState.Connecting,
    [NativeDfuState.EnablingDfuMode]: DfuState.EnablingDfuMode,
    [NativeDfuState.Uploading]: DfuState.Uploading,
    [NativeDfuState.Validating]: DfuState.Validating,
    [NativeDfuState.Disconnecting]: DfuState.Disconnecting,
    [NativeDfuState.Completed]: DfuState.Completed,
    [NativeDfuState.Aborted]: DfuState.Aborted,
    [NativeDfuState.Error]: DfuState.Error,
  };
  return map[nativeState];
}

export function mapDfuFirmwareTypeToNative(firmwareType: DfuFirmwareType): NativeDfuFirmwareType {
  const map: Record<DfuFirmwareType, NativeDfuFirmwareType> = {
    [DfuFirmwareType.Softdevice]: NativeDfuFirmwareType.Softdevice,
    [DfuFirmwareType.Bootloader]: NativeDfuFirmwareType.Bootloader,
    [DfuFirmwareType.Application]: NativeDfuFirmwareType.Application,
    [DfuFirmwareType.SoftdeviceBootloader]: NativeDfuFirmwareType.SoftdeviceBootloader,
    [DfuFirmwareType.SoftdeviceBootloaderApplication]: NativeDfuFirmwareType.SoftdeviceBootloaderApplication,
  };
  return map[firmwareType];
}

export function mapNativeDfuErrorToDfuError(nativeError: NativeDfuError): DfuError {
  const map: Record<NativeDfuError, DfuError> = {
    [NativeDfuError.None]: DfuError.None,
    [NativeDfuError.FileNotSpecified]: DfuError.FileNotSpecified,
    [NativeDfuError.FileInvalid]: DfuError.FileInvalid,
    [NativeDfuError.RemoteLegacyDFUInvalidState]: DfuError.RemoteLegacyDFUInvalidState,
    [NativeDfuError.RemoteLegacyDFUOperationFailed]: DfuError.RemoteLegacyDFUOperationFailed,
    [NativeDfuError.RemoteLegacyDFUDataExceedsLimit]: DfuError.RemoteLegacyDFUDataExceedsLimit,
    [NativeDfuError.RemoteLegacyDFUCrcError]: DfuError.RemoteLegacyDFUCrcError,
    [NativeDfuError.RemoteLegacyDFUOperationNotPermitted]: DfuError.RemoteLegacyDFUOperationNotPermitted,
    [NativeDfuError.RemoteSecureDFUInvalidObject]: DfuError.RemoteSecureDFUInvalidObject,
    [NativeDfuError.RemoteSecureDFUSignatureMismatch]: DfuError.RemoteSecureDFUSignatureMismatch,
    [NativeDfuError.RemoteSecureDFUUnsupportedType]: DfuError.RemoteSecureDFUUnsupportedType,
    [NativeDfuError.RemoteSecureDFUOperationNotPermitted]: DfuError.RemoteSecureDFUOperationNotPermitted,
    [NativeDfuError.RemoteSecureDFUOperationFailed]: DfuError.RemoteSecureDFUOperationFailed,
    [NativeDfuError.RemoteSecureDFUExtendedError]: DfuError.RemoteSecureDFUExtendedError,
    [NativeDfuError.RemoteButtonlessInvalidState]: DfuError.RemoteButtonlessInvalidState,
    [NativeDfuError.RemoteButtonlessOperationFailed]: DfuError.RemoteButtonlessOperationFailed,
    [NativeDfuError.RemoteButtonlessOperationNotSupported]: DfuError.RemoteButtonlessOperationNotSupported,
    [NativeDfuError.DeviceDisconnected]: DfuError.DeviceDisconnected,
    [NativeDfuError.BluetoothDisabled]: DfuError.BluetoothDisabled,
    [NativeDfuError.ServiceDiscoveryFailed]: DfuError.ServiceDiscoveryFailed,
    [NativeDfuError.DeviceNotSupported]: DfuError.DeviceNotSupported,
    [NativeDfuError.ReadingVersionFailed]: DfuError.ReadingVersionFailed,
    [NativeDfuError.EnablingControlPointFailed]: DfuError.EnablingControlPointFailed,
    [NativeDfuError.WritingCharacteristicFailed]: DfuError.WritingCharacteristicFailed,
    [NativeDfuError.ReceivingNotificationFailed]: DfuError.ReceivingNotificationFailed,
    [NativeDfuError.UnsupportedResponse]: DfuError.UnsupportedResponse,
    [NativeDfuError.BytesLost]: DfuError.BytesLost,
    [NativeDfuError.CrcError]: DfuError.CrcError,
    [NativeDfuError.InitPacketRequired]: DfuError.InitPacketRequired,
    [NativeDfuError.Unknown]: DfuError.Unknown,
  };
  return map[nativeError];
}

/**
 * DFU Manager - Manages Nordic DFU (Device Firmware Update) operations
 *
 * This class provides a high-level API for performing firmware updates
 * on Nordic Semiconductor devices using the Nordic DFU protocol.
 *
 * @example
 * ```typescript
 * const dfuManager = new DfuManager();
 *
 * await dfuManager.startDfu(
 *   deviceId,
 *   'file:///path/to/firmware.zip',
 *   DfuFirmwareType.Application,
 *   {
 *     onProgress: (deviceId, progress) => {
 *       console.log(`Progress: ${progress.percent}%`);
 *     },
 *     onStateChanged: (deviceId, state) => {
 *       console.log(`State: ${state}`);
 *     },
 *     onError: (deviceId, error, errorType, message) => {
 *       console.error(`Error: ${error} - ${message}`);
 *     },
 *     onCompleted: (deviceId, success) => {
 *       console.log(`DFU ${success ? 'completed' : 'failed'}`);
 *     },
 *   }
 * );
 * ```
 */
export class DfuManager {
  private Instance: NativeDfuManager;
  private _activeDfuDevices: Set<string> = new Set();

  constructor() {
    this.Instance = DfuNitroNativeFactory.create();
  }

  /**
   * Start DFU process on a connected device
   *
   * @param deviceId The ID of the device to update (must be connected via BLE)
   * @param firmwareUri Path or URI to the firmware file
   *   - iOS: Must be a ZIP file containing the firmware and manifest
   *   - Android: Can be BIN, HEX, or ZIP file
   * @param firmwareType Type of firmware to update
   * @param callbacks Callbacks for progress, state, error, and completion
   * @param options Optional DFU configuration options
   * @returns Promise resolving when DFU starts (not when it completes!)
   *
   * @throws Error if device is not connected or if another DFU is already in progress
   *
   * @example
   * ```typescript
   * try {
   *   await dfuManager.startDfu(
   *     'device-id',
   *     'file:///path/to/firmware.zip',
   *     DfuFirmwareType.Application,
   *     {
   *       onProgress: (deviceId, progress) => {
   *         console.log(`${progress.percent}% - Part ${progress.currentPart}/${progress.totalParts}`);
   *       },
   *       onStateChanged: (deviceId, state) => {
   *         console.log(`DFU State: ${state}`);
   *       },
   *       onError: (deviceId, error, errorType, message) => {
   *         console.error(`DFU Error: ${error}`, message);
   *       },
   *       onCompleted: (deviceId, success) => {
   *         if (success) {
   *           console.log('Firmware update completed successfully!');
   *         } else {
   *           console.error('Firmware update failed');
   *         }
   *       },
   *     },
   *     {
   *       packetReceiptNotificationParameter: 12,
   *       disableResume: false,
   *     }
   *   );
   * } catch (error) {
   *   console.error('Failed to start DFU:', error);
   * }
   * ```
   */
  public startDfu(
    deviceId: string,
    firmwareUri: string,
    firmwareType: DfuFirmwareType,
    callbacks: {
      onProgress?: DfuProgressCallback;
      onStateChanged?: DfuStateCallback;
      onError?: DfuErrorCallback;
      onCompleted?: DfuCompletionCallback;
    },
    options?: DfuServiceInitiatorOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if DFU is already in progress for this device
      if (this._activeDfuDevices.has(deviceId)) {
        reject(new Error('DFU already in progress for this device'));
        return;
      }

      // Prepare native options with defaults
      const nativeOptions: NativeDfuServiceInitiatorOptions = {
        packetReceiptNotificationParameter: options?.packetReceiptNotificationParameter ?? 12,
        forceScanningForNewAddressInLegacyDfu: options?.forceScanningForNewAddressInLegacyDfu ?? false,
        disableResume: options?.disableResume ?? false,
      };

      // Create native callbacks with type conversion
      const nativeProgressCallback: NativeDfuProgressCallback = (
        deviceId,
        percent,
        currentPart,
        totalParts,
        avgSpeed,
        currentSpeed
      ) => {
        callbacks.onProgress?.(deviceId, {
          percent,
          currentPart,
          totalParts,
          avgSpeed,
          currentSpeed,
        });
      };

      const nativeStateCallback: NativeDfuStateCallback = (deviceId, nativeState) => {
        const state = mapNativeDfuStateToDfuState(nativeState);

        // Track active DFU devices
        if (state === DfuState.Starting || state === DfuState.Connecting) {
          this._activeDfuDevices.add(deviceId);
        } else if (
          state === DfuState.Completed ||
          state === DfuState.Aborted ||
          state === DfuState.Error
        ) {
          this._activeDfuDevices.delete(deviceId);
        }

        callbacks.onStateChanged?.(deviceId, state);
      };

      const nativeErrorCallback: NativeDfuErrorCallback = (
        deviceId,
        nativeError,
        errorType,
        message
      ) => {
        const error = mapNativeDfuErrorToDfuError(nativeError);
        callbacks.onError?.(deviceId, error, errorType, message);
      };

      const nativeCompletionCallback: NativeDfuCompletionCallback = (deviceId, success) => {
        this._activeDfuDevices.delete(deviceId);
        callbacks.onCompleted?.(deviceId, success);
      };

      try {
        // Start DFU
        this.Instance.startDfu(
          deviceId,
          firmwareUri,
          mapDfuFirmwareTypeToNative(firmwareType),
          nativeOptions,
          nativeProgressCallback,
          nativeStateCallback,
          nativeErrorCallback,
          nativeCompletionCallback
        );

        resolve();
      } catch (error) {
        this._activeDfuDevices.delete(deviceId);
        reject(error);
      }
    });
  }

  /**
   * Pause ongoing DFU process
   *
   * @param deviceId The ID of the device
   * @returns true if paused successfully, false otherwise
   */
  public pauseDfu(deviceId: string): boolean {
    return this.Instance.pauseDfu(deviceId);
  }

  /**
   * Resume paused DFU process
   *
   * @param deviceId The ID of the device
   * @returns true if resumed successfully, false otherwise
   */
  public resumeDfu(deviceId: string): boolean {
    return this.Instance.resumeDfu(deviceId);
  }

  /**
   * Abort ongoing DFU process
   *
   * @param deviceId The ID of the device
   * @returns true if aborted successfully, false otherwise
   */
  public abortDfu(deviceId: string): boolean {
    const result = this.Instance.abortDfu(deviceId);
    if (result) {
      this._activeDfuDevices.delete(deviceId);
    }
    return result;
  }

  /**
   * Check if DFU is in progress for a device
   *
   * @param deviceId The ID of the device
   * @returns true if DFU is ongoing, false otherwise
   */
  public isDfuInProgress(deviceId: string): boolean {
    return this.Instance.isDfuInProgress(deviceId);
  }

  /**
   * Get current DFU state for a device
   *
   * @param deviceId The ID of the device
   * @returns Current DFU state
   */
  public getDfuState(deviceId: string): DfuState {
    const nativeState = this.Instance.getDfuState(deviceId);
    return mapNativeDfuStateToDfuState(nativeState);
  }
}
