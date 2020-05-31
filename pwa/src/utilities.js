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

export const generateSequenceOffRanges = (ranges, length) => {
  let bits = new Array(ranges.length).fill(false)
  let numberOfUsedRanges = 0
  let isTail = false
  const numberOfAllOptions = ranges.reduce(
    (accumulator, current) => accumulator + current.length, 0)
  let numberOfTailOptions = numberOfAllOptions
  let sequence = ''
  while (length--) {
    let optionIndex = random(
      0, isTail ? numberOfTailOptions : numberOfAllOptions)
    let lengthAccumulator = 0
    let rangeIndex = -1
    let rangeLength = 0
    do {
      lengthAccumulator += rangeLength
      do {
        rangeIndex += 1
      } while (isTail && bits[rangeIndex])
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

export const sha1 = async (message) => {
  let messageUint8Array = new TextEncoder('utf-8').encode(message)
  let hashArrayBuffer = await crypto.subtle.digest('SHA-1', messageUint8Array)
  let hashByteArray = Array.from(new Uint8Array(hashArrayBuffer))
  return hashByteArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export const getShortHash = async (message, length = 3) => {
  let hash = await sha1(message)
  return hash.slice(0, length)
}

export const sleep = (timeInMs) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, timeInMs)
  })

export const purgeSessionStorageAndLoadLogIn = () => {
  sessionStorage.clear()
  location.assign('/log-in')
}

export const purgeAllStoragesAndLoadIndex = () => {
  sessionStorage.clear()
  localStorage.clear()
  location.assign('/')
}

export const reloadPage = () => {
  // May trigger `beforeunload` if the editor is open.
  location.reload()
}
