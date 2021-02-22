import { expect } from 'chai'
import { instance, mock, verify, when } from 'ts-mockito'
import { initializeStorage } from './accessor'

describe('initializeStorage', () => {
  it('saves version if the storage is empty', () => {
    const mockStorage = mock<Storage>()
    when(mockStorage.length).thenReturn(0)

    initializeStorage(instance(mockStorage), [[1, () => {}]])

    verify(mockStorage.setItem('version', '1')).once()
  })

  it('assumes version 0 by default', () => {
    const mockStorage = mock<Storage>()
    when(mockStorage.length).thenReturn(1)
    when(mockStorage.getItem('version')).thenReturn(null)
    let latestUpgrade = 0

    initializeStorage(instance(mockStorage), [
      [1, () => { latestUpgrade = 1 }]
    ])

    expect(latestUpgrade).to.equal(1)
  })

  it('applies upgrades sequentially', () => {
    const mockStorage = mock<Storage>()
    when(mockStorage.length).thenReturn(1)
    when(mockStorage.getItem('version')).thenReturn('3')
    const sequence: number[] = []

    initializeStorage(instance(mockStorage), [
      [1, () => { sequence.push(1) }],
      [3, () => { sequence.push(3) }],
      [5, () => { sequence.push(5) }],
      [7, () => { sequence.push(7) }]
    ])

    expect(sequence).to.deep.equal([5, 7])
  })
})
