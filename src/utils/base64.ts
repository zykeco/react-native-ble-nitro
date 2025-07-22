import type { Base64 } from '../specs/types';

/**
 * Utility functions for Base64 encoding/decoding
 * Maintains compatibility with react-native-ble-plx Base64 operations
 */

/**
 * Converts a string to Base64
 */
export function stringToBase64(str: string): Base64 {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(str, 'utf8').toString('base64');
  } else if (typeof btoa !== 'undefined') {
    // Browser environment
    return btoa(str);
  } else {
    throw new Error('Base64 encoding not supported in this environment');
  }
}

/**
 * Converts Base64 to string
 */
export function base64ToString(base64: Base64): string {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(base64, 'base64').toString('utf8');
  } else if (typeof atob !== 'undefined') {
    // Browser environment
    return atob(base64);
  } else {
    throw new Error('Base64 decoding not supported in this environment');
  }
}

/**
 * Converts Uint8Array to Base64
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): Base64 {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(uint8Array).toString('base64');
  } else {
    // Browser environment
    const binary = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }
}

/**
 * Converts Base64 to Uint8Array
 */
export function base64ToUint8Array(base64: Base64): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } else {
    // Browser environment
    const binary = atob(base64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    return uint8Array;
  }
}

/**
 * Validates if a string is valid Base64
 */
export function isValidBase64(str: string): boolean {
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && (str.length % 4 === 0);
  } catch {
    return false;
  }
}