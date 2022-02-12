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
