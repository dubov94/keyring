import { expect } from 'chai'
import { HaveIBeenPwnedService } from './pwned_service'

describe('HaveIBeenPwnedService', () => {
  it('returns true if the suffix is found', async () => {
    const service = new HaveIBeenPwnedService(
      async (message) => {
        expect(message).to.equal('abc')
        return 'A9993E364706816ABA3E25717850C26C9CD0D89D'
      },
      async (prefix) => {
        expect(prefix).to.equal('A9993')
        return [
          '___________________________________:1',
          'E364706816ABA3E25717850C26C9CD0D89D:1'
        ].join('\n')
      }
    )

    expect(await service.checkKey('abc')).to.be.true
  })

  it('returns false if the suffix is not found', async () => {
    const service = new HaveIBeenPwnedService(
      async (message) => {
        expect(message).to.equal('secure')
        return 'D015CC465BDB4E51987DF7FB870472D3FB9A3505'
      },
      async (prefix) => {
        expect(prefix).to.equal('D015C')
        return '___________________________________:1'
      }
    )

    expect(await service.checkKey('secure')).to.be.false
  })
})
