import { Module } from 'vuex'
import { RootState, SessionState, constructInitialSessionState } from '@/store/state'
import { createMutation, createGetter } from '@/store/state_rx'

export const sessionUsername$ = createGetter<string | null>((state) => state.session.username)

enum MutationType {
  SET_USERNAME = 'setUsername',
}

const NAMESPACE = ['session']

export const setSessionUsername$ = createMutation<string>(NAMESPACE, MutationType.SET_USERNAME)

export const Session: Module<SessionState, RootState> = {
  namespaced: true,
  state: constructInitialSessionState,
  mutations: {
    [MutationType.SET_USERNAME] (state, value: string | null) {
      state.username = value
    }
  }
}
