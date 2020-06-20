import { expect } from 'chai'
import { areArraysEqual, createCharacterRange, generateSequenceOffRanges, shuffle } from './utilities'

const SIMPLE_RNG = (lower: number, upper: number): number =>
  lower + Math.floor(Math.random() * (upper - lower))

describe('shuffle', () => {
  it('should have uniform distribution', () => {
    const NUMBER_OF_PERMUTATIONS = 4 * 3 * 2
    const NUMBER_OF_TRIALS = NUMBER_OF_PERMUTATIONS * 1000
    const permutationToCount = new Map<string, number>()

    for (let i = 0; i < NUMBER_OF_TRIALS; ++i) {
      const sequence = [1, 2, 3, 4]
      shuffle(sequence, SIMPLE_RNG)
      const repr = JSON.stringify(sequence)
      if (!permutationToCount.has(repr)) {
        permutationToCount.set(repr, 0)
      }
      permutationToCount.set(repr, permutationToCount.get(repr)! + 1)
    }

    expect(permutationToCount).to.have.lengthOf(NUMBER_OF_PERMUTATIONS)
    permutationToCount.forEach((value) => {
      expect(value).to.be.greaterThan(900)
    })
  })
})

describe('generateSequenceOffRanges', () => {
  it('should hold the declared invariants', () => {
    const NUMBER_OF_TRIALS = 10 * 1000
    const RANGES = [
      createCharacterRange('a', 'z'),
      createCharacterRange('A', 'Z'),
      createCharacterRange('0', '9')
    ]

    for (let i = 0; i < NUMBER_OF_TRIALS; ++i) {
      const sequence = generateSequenceOffRanges(RANGES, 8, SIMPLE_RNG)
      expect(sequence).to.have.lengthOf(8)
      const bits = new Array(RANGES.length).fill(false)
      for (const c of sequence) {
        let j = 0
        for (; j < RANGES.length; ++j) {
          if (RANGES[j].indexOf(c) !== -1) {
            bits[j] = true
            break
          }
        }
        if (j === RANGES.length) {
          throw new Error(`'${c}' is not in ${JSON.stringify(RANGES)}`)
        }
      }
      expect(bits).not.to.contain(false)
    }
  })

  it('should construct a full set from single-unit ranges', () => {
    const RANGES = ['a', 'b', 'c']

    const sequence = generateSequenceOffRanges(RANGES, 3, SIMPLE_RNG)

    expect(sequence).to.be.oneOf(['abc', 'acb', 'bac', 'bca', 'cab', 'cba'])
  })
})

describe('createCharacterRange', () => {
  it('should produce [a-e]', () => {
    expect(createCharacterRange('a', 'e')).to.equal('abcde')
  })
})

describe('areArraysEqual', () => {
  it('should fail for arrays of different sizes', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2])).to.be.false
    expect(areArraysEqual([1, 2], [1, 2, 3])).to.be.false
  })

  it('should fail if one of the positions mismatches', () => {
    expect(areArraysEqual([1, 2, 3], [1, 5, 3])).to.be.false
  })

  it('should succeed if two arrays are equal', () => {
    expect(areArraysEqual([1, 2, 3], [1, 2, 3])).to.be.true
  })

  it('should succeed for two empty arrays', () => {
    expect(areArraysEqual([], [])).to.be.true
  })
})
