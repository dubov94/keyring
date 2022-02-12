import { Color } from '@/cryptography/strength_test_service'
import { success } from '@/redux/flow_signal'
import { hasData } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'
import { expect } from 'chai'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  exposedCliqueIdsSearchSignal,
  recentSessionsRetrievalReset,
  recentSessionsRetrievalSignal,
  vulnerableCliquesSearchSignal
} from './actions'
import reducer from './reducer'

describe('recentSessions', () => {
  const signalAction = recentSessionsRetrievalSignal(success([{
    creationTimeInMillis: 0,
    ipAddress: '127.0.0.1',
    userAgent: 'agent',
    geolocation: {}
  }]))

  describe('recentSessionRetrievalSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.recentSessions)).to.be.true
    })
  })

  describe('recentSessionsRetrievalReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, recentSessionsRetrievalReset()])

      expect(hasData(state.recentSessions)).to.be.false
    })
  })
})

describe('enableAnalysis', () => {
  it('sets the bit to true', () => {
    const state = reducer(undefined, enableAnalysis())

    expect(state.isAnalysisOn).to.be.true
  })
})

describe('disableAnalysis', () => {
  it('sets the bit to false', () => {
    const state = reduce(reducer, undefined, [
      enableAnalysis(),
      disableAnalysis()
    ])

    expect(state.isAnalysisOn).to.be.false
  })

  it('clears `duplicateGroups`', () => {
    const state = reduce(reducer, undefined, [
      duplicateGroupsSearchSignal(success([['0', '1']])),
      disableAnalysis()
    ])

    expect(hasData(state.duplicateGroups)).to.be.false
  })

  it('clears `exposedCliqueIds`', () => {
    const state = reduce(reducer, undefined, [
      exposedCliqueIdsSearchSignal(success(['0'])),
      disableAnalysis()
    ])

    expect(hasData(state.exposedCliqueIds)).to.be.false
  })

  it('clears `vulnerableCliques`', () => {
    const state = reduce(reducer, undefined, [
      vulnerableCliquesSearchSignal(success([{
        name: 'clique',
        score: { value: 0, color: Color.RED }
      }])),
      disableAnalysis()
    ])

    expect(hasData(state.vulnerableCliques)).to.be.false
  })
})

describe('duplicateGroupsSearchSignal', () => {
  it('updates the result', () => {
    const state = reducer(undefined, duplicateGroupsSearchSignal(success([['0', '1']])))

    expect(hasData(state.duplicateGroups)).to.be.true
  })
})

describe('exposedCliqueIdsSearchSignal', () => {
  it('updates the result', () => {
    const state = reducer(undefined, exposedCliqueIdsSearchSignal(success(['0'])))

    expect(hasData(state.exposedCliqueIds)).to.be.true
  })
})

describe('vulnerableCliquesSearchSignal', () => {
  it('updates the result', () => {
    const state = reducer(undefined, vulnerableCliquesSearchSignal(success([{
      name: 'clique',
      score: { value: 0, color: Color.RED }
    }])))

    expect(hasData(state.vulnerableCliques)).to.be.true
  })
})
