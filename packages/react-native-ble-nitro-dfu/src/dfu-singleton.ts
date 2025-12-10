import { DfuManager } from './dfu-manager';

let _instance: DfuManager;

/**
 * DfuNitro - Singleton wrapper for DfuManager
 *
 * Provides a convenient singleton instance for simple use cases
 * where only one DFU manager is needed.
 *
 * @example
 * ```typescript
 * import { DfuNitro, DfuFirmwareType } from 'react-native-ble-nitro';
 *
 * const dfuManager = DfuNitro.instance();
 *
 * await dfuManager.startDfu(
 *   deviceId,
 *   'file:///path/to/firmware.zip',
 *   DfuFirmwareType.Application,
 *   {
 *     onProgress: (deviceId, progress) => {
 *       console.log(`Progress: ${progress.percent}%`);
 *     },
 *     onCompleted: (deviceId, success) => {
 *       console.log(`DFU ${success ? 'completed' : 'failed'}`);
 *     },
 *   }
 * );
 * ```
 */
export class DfuNitro extends DfuManager {
  /**
   * Get a singleton instance of DfuNitro, will create one if it does not exist.
   * @returns {DfuManager} An instance of DfuNitro
   */
  public static instance(): DfuManager {
    if (!_instance) {
      _instance = new DfuManager();
    }
    return _instance;
  }
}
