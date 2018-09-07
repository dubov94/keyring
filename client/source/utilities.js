export const shuffle = (array) => {
  let limit = array.length
  while (limit > 0) {
    let index = random(0, limit--);
    [array[index], array[limit]] = [array[limit], array[index]]
  }
}

const RANDOM_RANGE_LIMIT = Math.pow(2, 32)

export const random = (lower, upper) => {
  let count = upper - lower
  let buffer = new Uint32Array(1)
  let uniformRangeLimit = RANDOM_RANGE_LIMIT - RANDOM_RANGE_LIMIT % count
  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0] >= uniformRangeLimit)
  return lower + buffer[0] % count
}

export const createCharacterRange = (first, last) => {
  let range = ''
  let firstCode = first.charCodeAt(0)
  let lastCode = last.charCodeAt(0)
  for (let charCode = firstCode; charCode <= lastCode; ++charCode) {
    range += String.fromCharCode(charCode)
  }
  return range
}

export const areArraysEqual = (left, right) => {
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
