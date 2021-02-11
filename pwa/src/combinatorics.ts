import { RNG, random } from './cryptography'

export const shuffle = <T>(array: Array<T>, rng: RNG = random) => {
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
export const generateInclusiveCombination = (ranges: Array<string>, length: number, rng: RNG = random): string => {
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
