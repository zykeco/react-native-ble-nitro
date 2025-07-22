/**
 * Service Data compatibility layer
 * 
 * Provides conversion between Nitro's structured ServiceDataEntry[] format
 * and the original { [uuid: string]: Base64 } format from react-native-ble-plx
 */

import type { ServiceDataEntry, UUID, Base64 } from '../specs/types.js';

/**
 * Convert ServiceDataEntry array to the original index signature format
 */
export function serviceDataArrayToMap(entries: ServiceDataEntry[] | null): { [uuid: string]: Base64 } | null {
  if (!entries || entries.length === 0) {
    return null;
  }

  const result: { [uuid: string]: Base64 } = {};
  entries.forEach(entry => {
    result[entry.uuid] = entry.data;
  });
  return result;
}

/**
 * Convert the original index signature format to ServiceDataEntry array
 */
export function serviceDataMapToArray(map: { [uuid: string]: Base64 } | null): ServiceDataEntry[] | null {
  if (!map || Object.keys(map).length === 0) {
    return null;
  }

  return Object.entries(map).map(([uuid, data]) => ({
    uuid: uuid as UUID,
    data,
  }));
}

/**
 * Merge two service data maps (used in device updates)
 */
export function mergeServiceDataMaps(
  existing: { [uuid: string]: Base64 } | null,
  updates: { [uuid: string]: Base64 } | null
): { [uuid: string]: Base64 } | null {
  if (!existing && !updates) return null;
  if (!existing) return updates;
  if (!updates) return existing;

  return { ...existing, ...updates };
}

/**
 * Merge two service data arrays (used in native updates)
 */
export function mergeServiceDataArrays(
  existing: ServiceDataEntry[] | null,
  updates: ServiceDataEntry[] | null
): ServiceDataEntry[] | null {
  const existingMap = serviceDataArrayToMap(existing);
  const updatesMap = serviceDataArrayToMap(updates);
  const mergedMap = mergeServiceDataMaps(existingMap, updatesMap);
  return serviceDataMapToArray(mergedMap);
}

/**
 * Check if service data contains a specific service UUID
 */
export function hasServiceUUID(serviceData: { [uuid: string]: Base64 } | null, uuid: UUID): boolean {
  return serviceData ? uuid in serviceData : false;
}

/**
 * Get service data for a specific UUID
 */
export function getServiceData(serviceData: { [uuid: string]: Base64 } | null, uuid: UUID): Base64 | null {
  return serviceData?.[uuid] || null;
}

/**
 * Get all service UUIDs from service data
 */
export function getServiceUUIDs(serviceData: { [uuid: string]: Base64 } | null): UUID[] {
  return serviceData ? Object.keys(serviceData) as UUID[] : [];
}