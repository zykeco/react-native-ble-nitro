import {
  BleErrorCode,
  BleATTErrorCode,
  BleIOSErrorCode,
  BleAndroidErrorCode
} from '../specs/types.js';
import type {
  NativeBleError,
  BleErrorCodeMessageMapping
} from '../specs/types.js';

/**
 * Default error messages for BLE error codes
 * Maintains compatibility with react-native-ble-plx error messages
 */
const BleErrorCodeMessage: BleErrorCodeMessageMapping = {
  [BleErrorCode.UnknownError]: 'Unknown error occurred',
  [BleErrorCode.BluetoothManagerDestroyed]: 'BLE Manager was destroyed',
  [BleErrorCode.OperationCancelled]: 'Operation was cancelled',
  [BleErrorCode.OperationTimedOut]: 'Operation timed out',
  [BleErrorCode.OperationStartFailed]: 'Operation could not be started',
  [BleErrorCode.InvalidIdentifiers]: 'Invalid identifiers provided',
  [BleErrorCode.BluetoothUnsupported]: 'Bluetooth is not supported on this device',
  [BleErrorCode.BluetoothUnauthorized]: 'App is not authorized to use Bluetooth',
  [BleErrorCode.BluetoothPoweredOff]: 'Bluetooth is powered off',
  [BleErrorCode.BluetoothInUnknownState]: 'Bluetooth is in unknown state',
  [BleErrorCode.BluetoothResetting]: 'Bluetooth is resetting',
  [BleErrorCode.BluetoothStateChangeFailed]: 'Bluetooth state change failed',
  [BleErrorCode.DeviceConnectionFailed]: 'Device connection failed',
  [BleErrorCode.DeviceDisconnected]: 'Device was disconnected',
  [BleErrorCode.DeviceRSSIReadFailed]: 'Failed to read RSSI',
  [BleErrorCode.DeviceAlreadyConnected]: 'Device is already connected',
  [BleErrorCode.DeviceNotFound]: 'Device not found',
  [BleErrorCode.DeviceNotConnected]: 'Device is not connected',
  [BleErrorCode.DeviceMTUChangeFailed]: 'Failed to change MTU',
  [BleErrorCode.ServicesDiscoveryFailed]: 'Services discovery failed',
  [BleErrorCode.IncludedServicesDiscoveryFailed]: 'Included services discovery failed',
  [BleErrorCode.ServiceNotFound]: 'Service not found',
  [BleErrorCode.ServicesNotDiscovered]: 'Services not discovered',
  [BleErrorCode.CharacteristicsDiscoveryFailed]: 'Characteristics discovery failed',
  [BleErrorCode.CharacteristicWriteFailed]: 'Characteristic write failed',
  [BleErrorCode.CharacteristicReadFailed]: 'Characteristic read failed',
  [BleErrorCode.CharacteristicNotifyChangeFailed]: 'Failed to change characteristic notification state',
  [BleErrorCode.CharacteristicNotFound]: 'Characteristic not found',
  [BleErrorCode.CharacteristicsNotDiscovered]: 'Characteristics not discovered',
  [BleErrorCode.CharacteristicInvalidDataFormat]: 'Invalid characteristic data format',
  [BleErrorCode.DescriptorsDiscoveryFailed]: 'Descriptors discovery failed',
  [BleErrorCode.DescriptorWriteFailed]: 'Descriptor write failed',
  [BleErrorCode.DescriptorReadFailed]: 'Descriptor read failed',
  [BleErrorCode.DescriptorNotFound]: 'Descriptor not found',
  [BleErrorCode.DescriptorsNotDiscovered]: 'Descriptors not discovered',
  [BleErrorCode.DescriptorInvalidDataFormat]: 'Invalid descriptor data format',
  [BleErrorCode.DescriptorWriteNotAllowed]: 'Descriptor write not allowed',
  [BleErrorCode.ScanStartFailed]: 'Failed to start scan',
  [BleErrorCode.LocationServicesDisabled]: 'Location services are disabled'
};

/**
 * BleError class that maintains 100% compatibility with react-native-ble-plx
 * Contains additional properties for platform-independent error handling
 */
export class BleError extends Error {
  /**
   * Platform independent error code
   */
  public readonly errorCode: BleErrorCode;

  /**
   * Platform independent error code related to ATT errors
   */
  public readonly attErrorCode: BleATTErrorCode | null;

  /**
   * iOS specific error code (if not an ATT error)
   */
  public readonly iosErrorCode: BleIOSErrorCode | null;

  /**
   * Android specific error code (if not an ATT error)
   */
  public readonly androidErrorCode: BleAndroidErrorCode | null;

  /**
   * Platform specific error message
   */
  public readonly reason: string | null;

  /**
   * Device ID associated with error (if applicable)
   */
  public readonly deviceID?: string;

  /**
   * Service UUID associated with error (if applicable)
   */
  public readonly serviceUUID?: string;

  /**
   * Characteristic UUID associated with error (if applicable)
   */
  public readonly characteristicUUID?: string;

  /**
   * Descriptor UUID associated with error (if applicable)
   */
  public readonly descriptorUUID?: string;

  /**
   * Internal error message for debugging
   */
  public readonly internalMessage?: string;

  constructor(
    nativeBleError: NativeBleError | string,
    errorMessageMapping: BleErrorCodeMessageMapping = BleErrorCodeMessage
  ) {
    if (typeof nativeBleError === 'string') {
      // Simple string error case
      super(nativeBleError);
      this.errorCode = BleErrorCode.UnknownError;
      this.attErrorCode = null;
      this.iosErrorCode = null;
      this.androidErrorCode = null;
      this.reason = nativeBleError;
      return;
    }

    // Native BLE error case
    const errorMessage = errorMessageMapping[nativeBleError.errorCode] || 'Unknown BLE error';
    super(errorMessage);

    this.errorCode = nativeBleError.errorCode;
    this.attErrorCode = nativeBleError.attErrorCode;
    this.iosErrorCode = nativeBleError.iosErrorCode;
    this.androidErrorCode = nativeBleError.androidErrorCode;
    this.reason = nativeBleError.reason;
    if (nativeBleError.deviceID !== undefined) this.deviceID = nativeBleError.deviceID;
    if (nativeBleError.serviceUUID !== undefined) this.serviceUUID = nativeBleError.serviceUUID;
    if (nativeBleError.characteristicUUID !== undefined) this.characteristicUUID = nativeBleError.characteristicUUID;
    if (nativeBleError.descriptorUUID !== undefined) this.descriptorUUID = nativeBleError.descriptorUUID;
    if (nativeBleError.internalMessage !== undefined) this.internalMessage = nativeBleError.internalMessage;

    // Set proper prototype chain
    Object.setPrototypeOf(this, BleError.prototype);
    this.name = 'BleError';
  }

  /**
   * Returns a string representation of the error with all relevant information
   */
  public toString(): string {
    const parts = [
      `BleError: ${this.message}`,
      `Error code: ${this.errorCode}`
    ];

    if (this.attErrorCode !== null) {
      parts.push(`ATT error code: ${this.attErrorCode}`);
    }

    if (this.iosErrorCode !== null) {
      parts.push(`iOS error code: ${this.iosErrorCode}`);
    }

    if (this.androidErrorCode !== null) {
      parts.push(`Android error code: ${this.androidErrorCode}`);
    }

    if (this.reason) {
      parts.push(`Reason: ${this.reason}`);
    }

    if (this.deviceID) {
      parts.push(`Device ID: ${this.deviceID}`);
    }

    if (this.serviceUUID) {
      parts.push(`Service UUID: ${this.serviceUUID}`);
    }

    if (this.characteristicUUID) {
      parts.push(`Characteristic UUID: ${this.characteristicUUID}`);
    }

    if (this.descriptorUUID) {
      parts.push(`Descriptor UUID: ${this.descriptorUUID}`);
    }

    return parts.join(', ');
  }
}

export { BleErrorCodeMessage };