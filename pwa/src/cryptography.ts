export const sha1 = async (message: string): Promise<string> => {
  const messageUint8Array = new TextEncoder().encode(message)
  const hashArrayBuffer = await crypto.subtle.digest('SHA-1', messageUint8Array)
  const hashByteArray = Array.from(new Uint8Array(hashArrayBuffer))
  return hashByteArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

const RANDOM_RANGE_LIMIT = Math.pow(2, 32)

export type RNG = (lower: number, upper: number) => number

export const random: RNG = (lower: number, upper: number): number => {
  const count = upper - lower
  const buffer = new Uint32Array(1)
  const uniformRangeLimit = RANDOM_RANGE_LIMIT - RANDOM_RANGE_LIMIT % count
  do {
    window.crypto.getRandomValues(buffer)
  } while (buffer[0] >= uniformRangeLimit)
  return lower + buffer[0] % count
}
