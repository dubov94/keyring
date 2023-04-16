import sodium from 'libsodium-wrappers-sumo'

export const toString = (message: Uint8Array): string => {
  return sodium.to_string(message)
}

export const fromString = (message: string): Uint8Array => {
  return sodium.from_string(message)
}

export const toBase64 = (uint8Array: Uint8Array): string => {
  return sodium.to_base64(uint8Array, sodium.base64_variants.URLSAFE_NO_PADDING)
}

export const fromBase64 = (base64String: string): Uint8Array => {
  return sodium.from_base64(base64String, sodium.base64_variants.URLSAFE_NO_PADDING)
}

export const pad = (buffer: Uint8Array, blockSize: number) => {
  return sodium.pad(buffer, blockSize)
}

export const unpad = (buffer: Uint8Array, blockSize: number) => {
  return sodium.unpad(buffer, blockSize)
}

export const generateSalt = (): Uint8Array => {
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
}

const COMPUTE_HASH_LABEL = '`computeHash`'

export const computeHash = (iterations: number, memoryInBytes: number, salt: Uint8Array, password: string, hashLength: number): Uint8Array => {
  console.time(COMPUTE_HASH_LABEL)
  const hash = sodium.crypto_pwhash(hashLength, password, salt, iterations, memoryInBytes, sodium.crypto_pwhash_ALG_ARGON2ID13)
  console.timeEnd(COMPUTE_HASH_LABEL)
  return hash
}

export const generateNonce = (): Uint8Array => {
  return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
}

export const encryptMessage = (encryptionKey: Uint8Array, nonce: Uint8Array, message: Uint8Array): Uint8Array => {
  return sodium.crypto_secretbox_easy(message, nonce, encryptionKey, 'uint8array')
}

export const decryptMessage = (encryptionKey: Uint8Array, nonce: Uint8Array, cipher: Uint8Array): Uint8Array => {
  return sodium.crypto_secretbox_open_easy(cipher, nonce, encryptionKey, 'uint8array')
}

export const nonceBase64Length = () => {
  const bitsCount = sodium.crypto_secretbox_NONCEBYTES * 8
  return Math.ceil(bitsCount / 6)
}

export const joinNonceCipher = (nonce: Uint8Array, cipher: Uint8Array): Uint8Array => {
  const pack = new Uint8Array(nonce.length + cipher.length)
  pack.set(nonce)
  pack.set(cipher, nonce.length)
  return pack
}

export const splitNonceCipher = (pack: Uint8Array): [Uint8Array, Uint8Array] => {
  return [
    pack.slice(0, sodium.crypto_secretbox_NONCEBYTES),
    pack.slice(sodium.crypto_secretbox_NONCEBYTES)
  ]
}
