import sodium from 'libsodium-wrappers'

export const fromBase64 = (base64String: string): Uint8Array => {
  return sodium.from_base64(base64String, sodium.base64_variants.URLSAFE_NO_PADDING)
}

export const toBase64 = (uint8Array: Uint8Array): string => {
  return sodium.to_base64(uint8Array, sodium.base64_variants.URLSAFE_NO_PADDING)
}

const base64Length = (bytesLength: number): number => {
  const bitsCount = bytesLength * 8
  return Math.ceil(bitsCount / 6)
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
  return toBase64(sodium.crypto_secretbox_easy(message, nonce, encryptionKey))
}

export const decryptMessage = (encryptionKey: Uint8Array, nonce: Uint8Array, base64Cipher: string): string => {
  return sodium.crypto_secretbox_open_easy(fromBase64(base64Cipher), nonce, encryptionKey, 'text')
}

export const joinNonceCipher = (nonce: Uint8Array, base64Cipher: string): string => {
  return `${toBase64(nonce)}${base64Cipher}`
}

export const splitNonceCipher = (pack: string): [Uint8Array, string] => {
  const nonceBase64Length = base64Length(sodium.crypto_secretbox_NONCEBYTES)
  return [fromBase64(pack.slice(0, nonceBase64Length)), pack.slice(nonceBase64Length)]
}
