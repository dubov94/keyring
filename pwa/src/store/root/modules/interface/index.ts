import { Module } from 'vuex'
import { RootState } from '@/store/state'
import { Toast } from './toast'
import { Editor } from './editor'

export const Interface: Module<{}, RootState> = {
  namespaced: true,
  modules: {
    toast: Toast,
    editor: Editor
  }
}
