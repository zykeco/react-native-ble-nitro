import { BleNitroLibraryErrorCode } from './specs/NativeBleNitro.nitro';
import type { BLENativeError } from './specs/NativeBleNitro';

// Declared in the Nitro spec so nitrogen generates the Kotlin and Swift enums
// from the same source; re-exported here as part of the public error API.
export { BleNitroLibraryErrorCode };

/** Domain of every failure detected by the library rather than the platform. */
export const BLE_NITRO_LIBRARY_DOMAIN = 'bleNitro.library';

/**
 * Base class for every failure BleNitroManager reports, so a single
 * `instanceof BleErrorBase` catches them all. `message` is for logging only —
 * never parse it to drive control flow.
 */
export abstract class BleErrorBase<TCode extends number = number> extends Error {
  readonly domain: string;
  readonly code: TCode;

  protected constructor(domain: string, code: TCode, message: string) {
    super(message);
    this.domain = domain;
    this.code = code;
  }
}

/**
 * A failure reported by the platform. `domain` and `code` are raw and
 * unmodified — the platform documentation defines what a pair means.
 */
export class BleError extends BleErrorBase {
  constructor(native: BLENativeError) {
    super(native.domain, native.code, native.message);
    this.name = 'BleError';
  }
}

/**
 * A failure detected by this library before or instead of a platform call
 * (e.g. "Device not connected"); `code` alone identifies it.
 */
export class BleNitroError extends BleErrorBase<BleNitroLibraryErrorCode> {
  constructor(native: BLENativeError) {
    super(native.domain, native.libraryCode ?? BleNitroLibraryErrorCode.UNKNOWN, native.message);
    this.name = 'BleNitroError';
  }
}

/** Library errors carry a `libraryCode`, platform errors do not. */
export function toBleError(native: BLENativeError): BleErrorBase {
  return native.libraryCode === undefined ? new BleError(native) : new BleNitroError(native);
}
