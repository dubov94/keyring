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

/** Given an array of ranges, generates a sequence having at least one symbol from each of the ranges. */
export const generateSequenceOffRanges = (ranges: Array<string>, length: number, rng: RNG = random): string => {
  // Each 'bit' is a boolean indicating whether at least one character from a range
  // with the same index has been used.
  const bits = new Array(ranges.length).fill(false)
  let numberOfUsedRanges = 0
  // `true` if the number of positions left is equal to the number of unused ranges.
  let isTail = false
  const numberOfAllOptions = ranges.reduce(
    (accumulator, current) => accumulator + current.length, 0)
  let numberOfTailOptions = numberOfAllOptions
  let sequence = ''
  while (length--) {
    const optionIndex = rng(
      0, isTail ? numberOfTailOptions : numberOfAllOptions)
    let lengthAccumulator = 0
    let rangeIndex = -1
    let rangeLength = 0
    do {
      lengthAccumulator += rangeLength
      do {
        rangeIndex += 1
      } while (isTail && bits[rangeIndex]) // eslint-disable-line no-unmodified-loop-condition
      rangeLength = ranges[rangeIndex].length
    } while (optionIndex >= lengthAccumulator + rangeLength)
    sequence += ranges[rangeIndex][optionIndex - lengthAccumulator]
    if (!bits[rangeIndex]) {
      bits[rangeIndex] = true
      numberOfUsedRanges += 1
      numberOfTailOptions -= rangeLength
    }
    if (bits.length - numberOfUsedRanges === length) {
      isTail = true
    }
  }
  return sequence
}

export const areArraysEqual = <T>(left: Array<T>, right: Array<T>): boolean => {
  if (left.length !== right.length) {
    return false
  } else {
    for (let index = 0; index < left.length; ++index) {
      if (left[index] !== right[index]) {
        return false
      }
    }
    return true
  }
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

export const getShortHash = async (message: string, length = 3): Promise<string> => {
  const hash = await sha1(message)
  return hash.slice(0, length)
}

export const sleep = (timeInMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, timeInMs)
  })

export const purgeSessionStorageAndLoadLogIn = (): void => {
  sessionStorage.clear()
  location.assign('/log-in')
}

export const purgeAllStoragesAndLoadIndex = (): void => {
  sessionStorage.clear()
  localStorage.clear()
  location.assign('/')
}

export const reloadPage = (): void => {
  // May trigger `beforeunload` if the editor is open.
  location.reload()
}
