import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { create, creationSignal, delete_, deletionSignal, emplace, update, updationSignal } from './actions'
import { Key } from '@/redux/entities'
import { castDraft } from 'immer'
import { isSignalFinale, isActionSuccess } from '@/redux/flow_signal'

export default createReducer<{
  semaphore: number;
  userKeys: Key[];
}>(
  {
    semaphore: 0,
    userKeys: []
  },
  (builder) => builder
    .addMatcher(isActionOf([create, update, delete_]), (state) => {
      state.semaphore += 1
    })
    .addMatcher(isActionOf([creationSignal, updationSignal, deletionSignal]), (state, action) => {
      if (isSignalFinale(action.payload)) {
        state.semaphore -= 1
      }
    })
    .addMatcher(isActionOf(emplace), (state, action) => {
      state.userKeys = castDraft([...action.payload].sort((left, right) => {
        const [leftTagCount, rightTagCount] = [left.tags.length, right.tags.length]
        for (let tagIndex = 0; tagIndex < leftTagCount && tagIndex < rightTagCount; ++tagIndex) {
          const tagOrdering = String.prototype.localeCompare.call(left.tags[tagIndex], right.tags[tagIndex])
          if (tagOrdering !== 0) {
            return tagOrdering
          }
        }
        if (leftTagCount === rightTagCount) {
          return String.prototype.localeCompare.call(left.value, right.value)
        } else {
          return leftTagCount - rightTagCount
        }
      }))
    })
    .addMatcher(isActionSuccess(creationSignal), (state, action) => {
      state.userKeys = castDraft([action.payload.data, ...state.userKeys])
    })
    .addMatcher(isActionSuccess(updationSignal), (state, action) => {
      const newKey = action.payload.data
      state.userKeys = castDraft(state.userKeys.map((key) => {
        return key.identifier === newKey.identifier ? newKey : key
      }))
    })
    .addMatcher(isActionSuccess(deletionSignal), (state, action) => {
      state.userKeys = state.userKeys.filter((key) => {
        return key.identifier !== action.payload.data
      })
    })
)
