export const SODIUM_WORKER_INTERFACE_TOKEN = 'SodiumWorkerInterface'

export interface SodiumWorkerInterface {
  toString(message: Uint8Array): Promise<string>;
  fromString(message: string): Promise<Uint8Array>;
  toBase64(unit8Array: Uint8Array): Promise<string>;
  fromBase64(base64String: string): Promise<Uint8Array>;
  pad(buffer: Uint8Array, blockSize: number): Promise<Uint8Array>;
  unpad(buffer: Uint8Array, blockSize: number): Promise<Uint8Array>;
  generateSalt(): Promise<Uint8Array>;
  computeHash(iterations: number, memoryInBytes: number, salt: Uint8Array, password: string, hashLength: number): Promise<Uint8Array>;
  generateNonce(): Promise<Uint8Array>;
  encryptMessage(encryptionKey: Uint8Array, nonce: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
  decryptMessage(encryptionKey: Uint8Array, nonce: Uint8Array, cipher: Uint8Array): Promise<Uint8Array>;
  nonceBase64Length(): Promise<number>;
  joinNonceCipher(nonce: Uint8Array, cipher: Uint8Array): Promise<Uint8Array>;
  splitNonceCipher(pack: Uint8Array): Promise<[Uint8Array, Uint8Array]>;
}
