// Imported from the `.nitro` spec directly (not `./specs/NativeBleNitro`) so
// this module never instantiates the native hybrid object.
import { BleNitroLibraryErrorCode, type BLENativeError } from './specs/NativeBleNitro.nitro';

// Declared in the Nitro spec so nitrogen generates the Kotlin and Swift enums
// from the same source; re-exported here as part of the public error API.
export { BleNitroLibraryErrorCode };

/**
 * Domain of every failure detected by the library rather than the platform.
 * Nitro cannot generate string constants, so this value is repeated as
 * `BleErrorDomain.library` (iOS) and `BleErrorDomain.LIBRARY` (Android) —
 * keep all three in sync.
 */
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
 * A failure reported by the platform or the peripheral. `domain` and `code`
 * are raw and unmodified — the platform documentation defines what a pair means.
 */
export class BlePlatformError extends BleErrorBase {
  constructor(domain: string, code: number, message: string) {
    super(domain, code, message);
    this.name = 'BlePlatformError';
  }
}

/**
 * A failure the library detected or decided itself — a guard clause, a
 * connection lost mid-operation, a timeout, or a platform failure that came
 * without an error code. `code` alone identifies it.
 */
export class BleNitroError extends BleErrorBase<BleNitroLibraryErrorCode> {
  constructor(code: BleNitroLibraryErrorCode, message: string) {
    super(BLE_NITRO_LIBRARY_DOMAIN, code, message);
    this.name = 'BleNitroError';
  }
}

/** An operation did not complete in time; `code` is always `TIMEOUT`. */
export class BleTimeoutError extends BleNitroError {
  constructor(operation: string, ms: number) {
    super(BleNitroLibraryErrorCode.TIMEOUT, `${operation} timed out after ${ms}ms`);
    this.name = 'BleTimeoutError';
  }
}

/**
 * Converts a native error payload into its JS error class.
 * @param native Error passed to a native callback
 * @returns BleNitroError if native set `libraryCode`, otherwise BlePlatformError
 */
export function toBleError(native: BLENativeError): BleErrorBase {
  return native.libraryCode === undefined
    ? new BlePlatformError(native.domain, native.code, native.message)
    : new BleNitroError(native.libraryCode, native.message);
}

/**
 * Converts the error of a native callback that reported `success = false`.
 * @param native Error passed alongside the failure, if any
 * @param operation Name of the failed operation, used in the fallback message
 * @returns The converted error, or an `UNKNOWN` BleNitroError if native passed none
 */
export function toBleErrorOrUnknown(native: BLENativeError | undefined, operation: string): BleErrorBase {
  return native
    ? toBleError(native)
    : new BleNitroError(BleNitroLibraryErrorCode.UNKNOWN, `Unknown error: ${operation}`);
}
