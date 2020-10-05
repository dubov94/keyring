import { Module } from 'vuex'
import {
  RootState,
  constructInitialEditorState,
  EditorState
} from '@/store/state'
import { createCommitSubject, createGetter } from '@/store/state_rx'

export const editorState$ = createGetter<EditorState>((state) => state.interface.editor)

enum MutationType {
  OPEN_EDITOR = 'openEditor',
  CLOSE_EDITOR = 'closeEditor',
}

const NAMESPACE = ['interface', 'editor']

type OpenEditorPayload = { identifier: string | null; reveal: boolean}
export const openEditor$ = createCommitSubject<OpenEditorPayload>(NAMESPACE, MutationType.OPEN_EDITOR)

export const closeEditor$ = createCommitSubject<void>(NAMESPACE, MutationType.CLOSE_EDITOR)

export const Editor: Module<EditorState, RootState> = {
  namespaced: true,
  state: constructInitialEditorState,
  mutations: {
    [MutationType.OPEN_EDITOR] (state, { identifier, reveal }: OpenEditorPayload) {
      state.reveal = reveal
      state.identifier = identifier
      state.show = true
    },
    [MutationType.CLOSE_EDITOR] (state) {
      Object.assign(state, constructInitialEditorState())
    }
  }
}
