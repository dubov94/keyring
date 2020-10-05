import { Module } from 'vuex'
import { UserState, RootState, constructInitialUserState } from '@/store/state'
import { Security } from './modules/security'
import { Settings } from './modules/settings'
import { Mutations } from './index'

export const User: Module<UserState, RootState> = {
  namespaced: true,
  modules: {
    security: Security,
    settings: Settings
  },
  state: constructInitialUserState,
  mutations: Mutations
}
