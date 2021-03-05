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
