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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  score (password: string, inputs: string[]): Score {
    return {
      value: 1,
      color: Color.GREEN
    }
  }
}

export class FakeTurnstileApi implements Turnstile.Api {
  _widgetId: string
  _token: string
  _container: null | HTMLElement

  constructor (widgetId: string, token: string) {
    this._container = null
    this._widgetId = widgetId
    this._token = token
  }

  render (container: HTMLElement, params: Turnstile.RenderParameters) {
    this._container = container
    params.callback!(this._token)
    return this._widgetId
  }

  reset () {}

  remove () {}

  getResponse () {
    return this._token
  }
}
