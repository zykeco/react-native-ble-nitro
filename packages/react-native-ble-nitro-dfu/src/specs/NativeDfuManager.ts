// Re-export types from the Nitro specification
export type {
  NativeDfuManager,
  DfuProgressInfo,
  DfuServiceInitiatorOptions,
  DfuProgressCallback,
  DfuStateCallback,
  DfuErrorCallback,
  DfuCompletionCallback,
} from './NativeDfuManager.nitro';

export {
  DfuState,
  DfuFirmwareType,
  DfuError,
} from './NativeDfuManager.nitro';
