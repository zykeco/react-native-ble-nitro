// Base types from react-native-ble-plx
export type Base64 = string;
export type UUID = string;
export type Identifier = number;
export type DeviceId = string;
export type TransactionId = string;

export enum RefreshGattMoment {
  OnConnected = 0
}

export enum CharacteristicSubscriptionType {
  Notification = 0,
  Indication = 1
}

// Service Data structure for BLE devices - since Nitro doesn't support index signatures,
// we'll use a more concrete structure or pass it as Base64 and handle parsing in native code
export interface ServiceDataEntry {
  uuid: UUID;
  data: Base64;
}

// Enums
export enum State {
  Unknown = 0,
  Resetting = 1,
  Unsupported = 2,
  Unauthorized = 3,
  PoweredOff = 4,
  PoweredOn = 5
}

export enum LogLevel {
  None = 0,
  Verbose = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5
}

export enum ScanMode {
  Opportunistic = -1,
  LowPower = 0,
  Balanced = 1,
  LowLatency = 2
}

export enum ScanCallbackType {
  AllMatches = 1,
  FirstMatch = 2,
  MatchLost = 4
}

export enum ConnectionPriority {
  Balanced = 0,
  High = 1,
  LowPower = 2
}

// Complex error code enums
export enum BleErrorCode {
  UnknownError = 0,
  BluetoothManagerDestroyed = 1,
  OperationCancelled = 2,
  OperationTimedOut = 3,
  OperationStartFailed = 4,
  InvalidIdentifiers = 5,
  BluetoothUnsupported = 100,
  BluetoothUnauthorized = 101,
  BluetoothPoweredOff = 102,
  BluetoothInUnknownState = 103,
  BluetoothResetting = 104,
  BluetoothStateChangeFailed = 105,
  DeviceConnectionFailed = 200,
  DeviceDisconnected = 201,
  DeviceRSSIReadFailed = 202,
  DeviceAlreadyConnected = 203,
  DeviceNotFound = 204,
  DeviceNotConnected = 205,
  DeviceMTUChangeFailed = 206,
  ServicesDiscoveryFailed = 300,
  IncludedServicesDiscoveryFailed = 301,
  ServiceNotFound = 302,
  ServicesNotDiscovered = 303,
  CharacteristicsDiscoveryFailed = 400,
  CharacteristicWriteFailed = 401,
  CharacteristicReadFailed = 402,
  CharacteristicNotifyChangeFailed = 403,
  CharacteristicNotFound = 404,
  CharacteristicsNotDiscovered = 405,
  CharacteristicInvalidDataFormat = 406,
  DescriptorsDiscoveryFailed = 500,
  DescriptorWriteFailed = 501,
  DescriptorReadFailed = 502,
  DescriptorNotFound = 503,
  DescriptorsNotDiscovered = 504,
  DescriptorInvalidDataFormat = 505,
  DescriptorWriteNotAllowed = 506,
  ScanStartFailed = 600,
  LocationServicesDisabled = 601
}

export enum BleATTErrorCode {
  Success = 0,
  InvalidHandle = 1,
  ReadNotPermitted = 2,
  WriteNotPermitted = 3,
  InvalidPdu = 4,
  InsufficientAuthentication = 5,
  RequestNotSupported = 6,
  InvalidOffset = 7,
  InsufficientAuthorization = 8,
  PrepareQueueFull = 9,
  AttributeNotFound = 10,
  AttributeNotLong = 11,
  InsufficientEncryptionKeySize = 12,
  InvalidAttributeValueLength = 13,
  UnlikelyError = 14,
  InsufficientEncryption = 15,
  UnsupportedGroupType = 16,
  InsufficientResources = 17
}

export enum BleIOSErrorCode {
  Unknown = 0,
  InvalidParameters = 1,
  InvalidHandle = 2,
  NotConnected = 3,
  OutOfSpace = 4,
  OperationCancelled = 5,
  ConnectionTimeout = 6,
  PeripheralDisconnected = 7,
  UuidNotAllowed = 8,
  AlreadyAdvertising = 9,
  ConnectionFailed = 10,
  ConnectionLimitReached = 11,
  UnknownDevice = 12
}

export enum BleAndroidErrorCode {
  NoResources = 0x80,
  InternalError = 0x81,
  WrongState = 0x82,
  DbFull = 0x83,
  Busy = 0x84,
  Error = 0x85,
  CmdStarted = 0x86,
  IllegalParameter = 0x87,
  Pending = 0x88,
  AuthFail = 0x89,
  More = 0x8a,
  InvalidCfg = 0x8b,
  ServiceStarted = 0x8c,
  EncrypedNoMitm = 0x8d,
  NotEncrypted = 0x8e,
  Congested = 0x8f
}

// Interfaces for configuration and options
export interface ScanOptions {
  allowDuplicates?: boolean;
  scanMode?: ScanMode;
  callbackType?: ScanCallbackType;
  legacyScan?: boolean;
}

export interface ConnectionOptions {
  autoConnect: boolean;
  requestMTU: number;
  timeout: number;
}

export interface BleManagerOptions {
  restoreStateIdentifier?: string;
  restoreStateFunction?: (restoredState: BleRestoredState | null) => void;
  errorCodesToMessagesMapping?: BleErrorCodeMessageMapping;
}

export interface BleRestoredState {
  connectedPeripherals: NativeDevice[];
}

export type BleErrorCodeMessageMapping = { [key in BleErrorCode]: string };

// Native device/service/characteristic/descriptor interfaces
export interface NativeDevice {
  id: DeviceId;
  name: string | null;
  rssi: number | null;
  mtu: number;
  manufacturerData: Base64 | null;
  rawScanRecord: Base64;
  serviceData: ServiceDataEntry[] | null;
  serviceUUIDs: UUID[] | null;
  localName: string | null;
  txPowerLevel: number | null;
  solicitedServiceUUIDs: UUID[] | null;
  isConnectable: boolean | null;
  overflowServiceUUIDs: UUID[] | null;
}

export interface NativeService {
  id: Identifier;
  uuid: UUID;
  deviceID: DeviceId;
  isPrimary: boolean;
}

export interface NativeCharacteristic {
  id: Identifier;
  uuid: UUID;
  serviceID: Identifier;
  serviceUUID: UUID;
  deviceID: DeviceId;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isNotifying: boolean;
  isIndicatable: boolean;
  value: Base64 | null;
}

export interface NativeDescriptor {
  id: Identifier;
  uuid: UUID;
  characteristicID: Identifier;
  characteristicUUID: UUID;
  serviceID: Identifier;
  serviceUUID: UUID;
  deviceID: DeviceId;
  value: Base64 | null;
}

export interface NativeBleError {
  errorCode: BleErrorCode;
  attErrorCode: BleATTErrorCode | null;
  iosErrorCode: BleIOSErrorCode | null;
  androidErrorCode: BleAndroidErrorCode | null;
  reason: string | null;
  deviceID?: string;
  serviceUUID?: string;
  characteristicUUID?: string;
  descriptorUUID?: string;
  internalMessage?: string;
}

// Subscription interface
export interface Subscription {
  remove(): void;
}

// Callback types for listeners
export type StateListener = (newState: State) => void;
export type DeviceScanListener = (error: NativeBleError | null, scannedDevice: NativeDevice | null) => void;
export type DeviceDisconnectedListener = (error: NativeBleError | null, device: NativeDevice | null) => void;
export type CharacteristicMonitorListener = (error: NativeBleError | null, characteristic: NativeCharacteristic | null) => void;