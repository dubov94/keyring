import { Color, Score, StrengthTestService } from '@/cryptography/strength_test_service'
import { UidService } from '@/cryptography/uid_service'

export class SequentialFakeUidService implements UidService {
  _uidCounter: number

  constructor () {
    this._uidCounter = 1
  }

  v4 () {
    return `uid-${this._uidCounter++}`
  }
}

export class PositiveFakeStrengthTestService implements StrengthTestService {
  score (password: string, inputs: string[]): Score {
    return {
      value: 1,
      color: Color.GREEN
    }
  }
}
