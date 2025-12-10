import { BleNitroManager } from "./manager";

let _instance: BleNitroManager;

export class BleNitro extends BleNitroManager {
  /**
   * Get a singleton instance of BleNitro, will create one if it does not exist.
   * Singleton implementation does not allow to use state restoration on iOS!
   * @returns {BleNitroManager} An instance of BleNitro
   */
  public static instance(): BleNitroManager {
    if (!_instance) {
      _instance = new BleNitroManager();
    }
    return _instance;
  }
}