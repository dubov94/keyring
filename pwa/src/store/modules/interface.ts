import Vue from 'vue'
import { Module } from 'vuex'
import {
  InterfaceState,
  RootState,
  constructInitialToastState,
  constructInitialEditorState,
  constructInitialInterfaceState
} from '@/store/root/state'

export enum MutationType {
  SHOW_TOAST = 'showToast',
  HIDE_TOAST = 'hideToast',
  OPEN_EDITOR = 'openEditor',
  CLOSE_EDITOR = 'closeEditor',
}

export enum ActionType {
  DISPLAY_SNACKBAR = 'displaySnackbar',
}

export const Interface: Module<InterfaceState, RootState> = {
  namespaced: true,
  state: constructInitialInterfaceState,
  mutations: {
    [MutationType.SHOW_TOAST] (state, { message, timeout }: { message: string; timeout: number }) {
      state.toast.message = message
      state.toast.timeout = timeout
      state.toast.show = true
    },
    [MutationType.HIDE_TOAST] (state) {
      Object.assign(state.toast, constructInitialToastState())
    },
    [MutationType.OPEN_EDITOR] (state, { identifier, reveal }: { identifier: string | null; reveal: boolean}) {
      state.editor.reveal = reveal
      state.editor.identifier = identifier
      state.editor.show = true
    },
    [MutationType.CLOSE_EDITOR] (state) {
      Object.assign(state.editor, constructInitialEditorState())
    }
  },
  actions: {
    async [ActionType.DISPLAY_SNACKBAR] (
      { commit },
      configuration: { message: string; timeout: number }
    ): Promise<void> {
      commit(MutationType.HIDE_TOAST)
      await Vue.nextTick()
      commit(MutationType.SHOW_TOAST, configuration)
    }
  }
}
