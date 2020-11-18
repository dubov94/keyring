import Vue from 'vue'
import { Module } from 'vuex'
import {
  RootState,
  constructInitialToastState,
  ToastState
} from '@/store/state'
import { Subject, of, from } from 'rxjs'
import { createMutation, createGetter } from '@/store/state_rx'
import { tap, switchMap, map } from 'rxjs/operators'

export const toastState$ = createGetter<ToastState>((state) => state.interface.toast)

enum MutationType {
  SHOW_TOAST = 'showToast',
  HIDE_TOAST = 'hideToast',
}

const NAMESPACE = ['interface', 'toast']

type ShowToastPayload = { message: string; timeout?: number }
const _showToast$ = createMutation<ShowToastPayload>(NAMESPACE, MutationType.SHOW_TOAST)

export const hideToast$ = createMutation<void>(NAMESPACE, MutationType.HIDE_TOAST)

export const showToast$ = new Subject<ShowToastPayload>()
showToast$.pipe(switchMap((configuration) => of(configuration).pipe(
  tap(() => { hideToast$.next() }),
  switchMap((configuration) => from(Vue.nextTick()).pipe(map(() => configuration))),
  tap((configuration) => { _showToast$.next(configuration) })
))).subscribe()

export const Toast: Module<ToastState, RootState> = {
  namespaced: true,
  state: constructInitialToastState(),
  mutations: {
    [MutationType.SHOW_TOAST] (state, { message, timeout = 5000 }: ShowToastPayload) {
      state.message = message
      state.timeout = timeout
      state.show = true
    },
    [MutationType.HIDE_TOAST] (state) {
      Object.assign(state, constructInitialToastState())
    }
  }
}
