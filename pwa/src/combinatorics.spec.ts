import { expect } from 'chai'
import { createCharacterRange, generateInclusiveCombination, shuffle } from './combinatorics'
import sum from 'lodash/sum'
import isEqual from 'lodash/isEqual'
import { chiSquaredDistributionTable, factorial, permutationsHeap } from 'simple-statistics'

const TEST_RNG = (lower: number, upper: number): number =>
  lower + Math.floor(Math.random() * (upper - lower))

describe('shuffle', () => {
  it('should have uniform distribution', () => {
    const sequence = () => [1, 2, 3, 4]
    const NUMBER_OF_GROUPS = factorial(4)
    const TRIALS_PER_GROUP = 1000
    const allPermutations = permutationsHeap(sequence())
    const histogram = new Array(NUMBER_OF_GROUPS).fill(0)

    for (let i = 0; i < NUMBER_OF_GROUPS * TRIALS_PER_GROUP; ++i) {
      const sequence = [1, 2, 3, 4]
      shuffle(sequence, TEST_RNG)
      histogram[allPermutations.findIndex((permutation) => isEqual(permutation, sequence))] += 1
    }

    const chiSquared = sum(Object.values(histogram).map((count): number => {
      return Math.pow(count - TRIALS_PER_GROUP, 2) / TRIALS_PER_GROUP
    }))
    // DF = NUMBER_OF_GROUPS - 2 - 1
    expect(chiSquared).to.be.at.most(chiSquaredDistributionTable[21][0.05])
  })
})

describe('generateInclusiveCombination', () => {
  it('should hold the declared invariants', () => {
    const NUMBER_OF_TRIALS = 10 * 1000
    const RANGES = [
      createCharacterRange('a', 'z'),
      createCharacterRange('A', 'Z'),
      createCharacterRange('0', '9')
    ]

    for (let i = 0; i < NUMBER_OF_TRIALS; ++i) {
      const sequence = generateInclusiveCombination(RANGES, 8, TEST_RNG)
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

    const sequence = generateInclusiveCombination(RANGES, 3, TEST_RNG)

    expect(sequence).to.be.oneOf(['abc', 'acb', 'bac', 'bca', 'cab', 'cba'])
  })
})

describe('createCharacterRange', () => {
  it('should produce [a-e]', () => {
    expect(createCharacterRange('a', 'e')).to.equal('abcde')
  })
})
