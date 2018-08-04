import Vue from 'vue'

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

export default {
  namespaced: true,
  state: {
    toast: createToastState(),
    editor: createEditorState()
  },
  mutations: {
    showToast (state, { message, timeout }) {
      state.toast.message = message
      state.toast.timeout = timeout
      state.toast.show = true
    },
    hideToast (state) {
      Object.assign(state.toast, createToastState())
    },
    openEditor (state, { identifier, reveal }) {
      state.editor.reveal = reveal
      state.editor.identifier = identifier
      state.editor.show = true
    },
    closeEditor (state) {
      Object.assign(state.editor, createEditorState())
    }
  },
  actions: {
    async displaySnackbar ({ commit }, configuration) {
      commit('hideToast')
      await Vue.nextTick()
      commit('showToast', configuration)
    }
  }
}
