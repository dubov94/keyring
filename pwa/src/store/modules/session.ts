import { Module } from 'vuex'
import { RootState, SessionState, constructInitialSessionState } from '@/store/root/state'

export enum GetterType {
  HAS_USERNAME = 'hasUsername',
}

export enum MutationType {
  SET_USERNAME = 'setUsername',
}

export const Session: Module<SessionState, RootState> = {
  namespaced: true,
  state: constructInitialSessionState,
  getters: {
    [GetterType.HAS_USERNAME]: (state) => state.username !== null
  },
  mutations: {
    [MutationType.SET_USERNAME] (state, value) {
      state.username = value
    }
  }
}
