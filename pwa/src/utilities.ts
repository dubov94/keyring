const RANDOM_RANGE_LIMIT = Math.pow(2, 32)

type RNG = (lower: number, upper: number) => number

export const random: RNG = (lower: number, upper: number): number => {
  const count = upper - lower
  const buffer = new Uint32Array(1)
  const uniformRangeLimit = RANDOM_RANGE_LIMIT - RANDOM_RANGE_LIMIT % count
  do {
    window.crypto.getRandomValues(buffer)
  } while (buffer[0] >= uniformRangeLimit)
  return lower + buffer[0] % count
}

export const shuffle = <T>(array: Array<T>, rng: RNG = random): void => {
  let limit = array.length
  while (limit > 0) {
    const index = rng(0, limit--);
    [array[index], array[limit]] = [array[limit], array[index]]
  }
}

export const createCharacterRange = (first: string, last: string): string => {
  let range = ''
  const firstCode = first.charCodeAt(0)
  const lastCode = last.charCodeAt(0)
  for (let charCode = firstCode; charCode <= lastCode; ++charCode) {
    range += String.fromCharCode(charCode)
  }
  return range
}

/** Given an array of ranges generates a sequence having at least one symbol from each of the ranges. */
export const generateSequenceOffRanges = (ranges: Array<string>, length: number, rng: RNG = random): string => {
  const sequence: Array<string> = []
  let pool = ''
  for (const range of ranges) {
    sequence.push(range[rng(0, range.length)])
    pool += range
  }
  for (let i = ranges.length; i < length; ++i) {
    sequence.push(pool[rng(0, pool.length)])
  }
  shuffle(sequence, rng)
  return sequence.join('')
}

export const sha1 = async (message: string): Promise<string> => {
  const messageUint8Array = new TextEncoder().encode(message)
  const hashArrayBuffer = await crypto.subtle.digest('SHA-1', messageUint8Array)
  const hashByteArray = Array.from(new Uint8Array(hashArrayBuffer))
  return hashByteArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export const generatePassword = (length: number): string => generateSequenceOffRanges(
  [
    '@#$_&-+()/' + '*"\':;!?',
    createCharacterRange('0', '9'),
    createCharacterRange('A', 'Z'),
    createCharacterRange('a', 'z')
  ],
  length
)

export type Undefinable<T> = T | undefined
