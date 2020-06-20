export const SODIUM_TOKEN = 'SodiumInterface'

export interface SodiumInterface {
  toBase64(unit8Array: Uint8Array): Promise<string>;
  fromBase64(base64String: string): Promise<Uint8Array>;
  generateSalt(): Promise<Uint8Array>;
  computeHash(iterations: number, memoryInBytes: number, salt: Uint8Array, password: string, hashLength: number): Promise<Uint8Array>;
  generateNonce(): Promise<Uint8Array>;
  encryptMessage(encryptionKey: Uint8Array, nonce: Uint8Array, message: string): Promise<string>;
  decryptMessage(encryptionKey: Uint8Array, nonce: Uint8Array, cipher: string): Promise<string>;
  joinNonceCipher(nonce: Uint8Array, cipher: string): Promise<string>;
  splitNonceCipher(pack: string): Promise<[Uint8Array, string]>;
}
