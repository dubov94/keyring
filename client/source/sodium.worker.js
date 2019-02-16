import sodium from 'libsodium-wrappers'
// Eventually we may want to `await sodium.ready`.

const ARGON2_DEFAULT_M = 64 * 1024 * 1024
const ARGON2_DEFAULT_T = 1

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

const PARAMETRIZATION_REGULAR_EXPRESSION = new RegExp(
  '^\\$(argon2(?:i|d|id))' +
  '\\$m=([1-9][0-9]*),t=([1-9][0-9]*),p=([1-9][0-9]*)' +
  '\\$([A-Za-z0-9-_]{22})$'
)

export const generateArgon2Parametrization = () => {
  return '$argon2id' +
    `$m=${ARGON2_DEFAULT_M},t=${ARGON2_DEFAULT_T},p=1` +
    `$${sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES, 'base64')}`
}

export const computeArgon2Hash = (parametrization, password) => {
  let [, algorithm, m, t, p, salt] =
    PARAMETRIZATION_REGULAR_EXPRESSION.exec(parametrization)
  ;[m, t, p] = [m, t, p].map(Number)
  if (algorithm === 'argon2id' && p === 1) {
    return sodium.crypto_pwhash(
      AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES,
      password,
      sodium.from_base64(salt),
      t, m, sodium.crypto_pwhash_ALG_ARGON2ID13
    )
  } else {
    throw new Error('Unsupported hashing parameters: ' +
      `algorithm = '${algorithm}', lanes = '${p}'.`)
  }
}

export const extractAuthDigestAndEncryptionKey = (hash) => {
  return {
    authDigest: sodium.to_base64(hash.slice(0, AUTH_DIGEST_SIZE_IN_BYTES)),
    encryptionKey: sodium.to_base64(hash.slice(-ENCRYPTION_KEY_SIZE_IN_BYTES))
  }
}

export const encryptMessage = (encryptionKey, message) => {
  let nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES, 'base64')
  let cipher = sodium.crypto_secretbox_easy(
    message,
    sodium.from_base64(nonce),
    sodium.from_base64(encryptionKey),
    'base64'
  )
  return `${nonce}${cipher}`
}

export const decryptMessage = (encryptionKey, string) => {
  let nonceBase64Length = sodium.crypto_secretbox_NONCEBYTES * 8 / 6
  let nonce = string.slice(0, nonceBase64Length)
  let cipher = string.slice(nonceBase64Length)
  return sodium.crypto_secretbox_open_easy(
    sodium.from_base64(cipher),
    sodium.from_base64(nonce),
    sodium.from_base64(encryptionKey),
    'text'
  )
}
