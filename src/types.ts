export type ByteArray = number[];

export function arrayBufferToByteArray(buffer: ArrayBuffer): ByteArray {
  return Array.from(new Uint8Array(buffer));
}

export function byteArrayToArrayBuffer(data: ByteArray): ArrayBuffer {
  return new Uint8Array(data).buffer;
}
