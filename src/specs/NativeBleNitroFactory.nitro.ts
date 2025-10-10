import { HybridObject } from "react-native-nitro-modules";
import { BLEDevice, NativeBleNitro } from "./NativeBleNitro.nitro";

export interface NativeBleNitroFactory extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  create(nativeRestoreStateIdentifier?: string, restoreStateCallback?: (peripherals: BLEDevice[]) => void): NativeBleNitro;
}