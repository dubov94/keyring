import Vue from 'vue'
import { Module } from 'vuex'
import { InterfaceState, RootState } from '@/store/root/state'

const createToastState = () => ({
  message: null,
  timeout: NaN,
  show: false
})

const createEditorState = () => ({
  reveal: false,
  identifier: undefined,
  show: false
})

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
  state: {
    toast: createToastState(),
    editor: createEditorState()
  },
  mutations: {
    [MutationType.SHOW_TOAST] (state, { message, timeout }: { message: string; timeout: number }) {
      state.toast.message = message
      state.toast.timeout = timeout
      state.toast.show = true
    },
    [MutationType.HIDE_TOAST] (state) {
      Object.assign(state.toast, createToastState())
    },
    [MutationType.OPEN_EDITOR] (state, { identifier, reveal }: { identifier: string | null; reveal: boolean}) {
      state.editor.reveal = reveal
      state.editor.identifier = identifier
      state.editor.show = true
    },
    [MutationType.CLOSE_EDITOR] (state) {
      Object.assign(state.editor, createEditorState())
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
