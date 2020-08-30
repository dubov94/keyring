import { Module } from 'vuex'
import { RootState, SessionState, constructInitialSessionState } from '@/store/state'
import { Subject } from 'rxjs'
import { getStore } from '../injections';
import { createCommitSubject } from '../subject';

export enum GetterType {
  HAS_USERNAME = 'hasUsername',
}

export enum MutationType {
  SET_USERNAME = 'setUsername',
}

export const setUsername$ = createCommitSubject<string>(`session/${MutationType.SET_USERNAME}`)

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
