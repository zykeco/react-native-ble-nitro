import type { UUID } from '../specs/types.js';

/**
 * Converts UUID to full 128bit, lowercase format which should be used to compare UUID values.
 * This function maintains 100% compatibility with react-native-ble-plx
 *
 * @param uuid 16bit, 32bit or 128bit UUID.
 * @returns 128bit lowercase UUID.
 */
export function fullUUID(uuid: UUID): UUID {
  if (typeof uuid !== 'string') {
    throw new Error('UUID must be a string');
  }

  // Remove dashes and convert to lowercase
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

  // 16-bit UUID (4 characters)
  if (cleanUuid.length === 4) {
    return `0000${cleanUuid}-0000-1000-8000-00805f9b34fb`;
  }

  // 32-bit UUID (8 characters)
  if (cleanUuid.length === 8) {
    return `${cleanUuid}-0000-1000-8000-00805f9b34fb`;
  }

  // 128-bit UUID (32 characters)
  if (cleanUuid.length === 32) {
    return [
      cleanUuid.substring(0, 8),
      cleanUuid.substring(8, 12),
      cleanUuid.substring(12, 16),
      cleanUuid.substring(16, 20),
      cleanUuid.substring(20, 32)
    ].join('-');
  }

  // Already formatted UUID with dashes
  if (cleanUuid.length === 36 && uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return uuid.toLowerCase();
  }

  throw new Error(`Invalid UUID format: ${uuid}`);
}