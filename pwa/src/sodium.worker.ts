import sodium from 'libsodium-wrappers'

export const fromBase64 = (base64String: string): Uint8Array => {
  return sodium.from_base64(base64String)
}

export const toBase64 = (uint8Array: Uint8Array): string => {
  return sodium.to_base64(uint8Array)
}

export const generateSalt = (): Uint8Array => {
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
}

export const computeHash = (iterations: number, memoryInBytes: number, salt: Uint8Array, password: string, hashLength: number): Uint8Array => {
  return sodium.crypto_pwhash(hashLength, password, salt, iterations, memoryInBytes, sodium.crypto_pwhash_ALG_ARGON2ID13)
}

export const generateNonce = (): Uint8Array => {
  return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
}

export const encryptMessage = (encryptionKey: Uint8Array, nonce: Uint8Array, message: string): string => {
  return sodium.crypto_secretbox_easy(message, nonce, encryptionKey, 'base64')
}

export const decryptMessage = (encryptionKey: Uint8Array, nonce: Uint8Array, base64Cipher: string): string => {
  return sodium.crypto_secretbox_open_easy(sodium.from_base64(base64Cipher), nonce, encryptionKey, 'text')
}

export const joinNonceCipher = (nonce: Uint8Array, base64Cipher: string): string => {
  return `${sodium.to_base64(nonce)}${base64Cipher}`
}

export const splitNonceCipher = (pack: string): [Uint8Array, string] => {
  const nonceBase64Length = sodium.crypto_secretbox_NONCEBYTES * 8 / 6
  return [sodium.from_base64(pack.slice(0, nonceBase64Length)), pack.slice(nonceBase64Length)]
}
