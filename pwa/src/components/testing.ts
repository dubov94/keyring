import Vue, { ComponentOptions, VueConstructor } from 'vue'
import { createLocalVue } from '@vue/test-utils'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
import { RootAction } from '@/redux/root_action'
import FormTextField from '@/components/FormTextField.vue'
import { Future, newFuture } from '@/future'
import last from 'lodash/last'
import { Store } from '@reduxjs/toolkit'
import { RootState } from '@/redux/root_reducer'

export const setUpLocalVue = (): VueConstructor<Vue> => {
  const localVue = createLocalVue()
  localVue.use(Vuetify)
  localVue.use(Vuelidate)
  localVue.component('form-text-field', FormTextField)
  return localVue
}

export class ActionQueue {
  private queue: Future<RootAction>[] = []
  private index: number

  constructor () {
    this.queue.push(newFuture())
    this.index = 0
  }

  enqueue (action: RootAction) {
    last(this.queue)!.resolve(action)
    this.queue.push(newFuture())
  }

  dequeue (): Promise<RootAction> {
    return this.queue[this.index++].promise
  }
}

export const setUpStandardMocks = (actionQueue: ActionQueue) => {
  const $t = (key: string) => key
  const dispatch = (action: RootAction) => {
    actionQueue.enqueue(action)
  }
  return { $t, dispatch }
}

export const setUpStateMixin = (store: Store<RootState, RootAction>): ComponentOptions<Vue> => ({
  data () {
    return {
      $state: store.getState()
    }
  },
  created () {
    store.subscribe(() => {
      ;(<Vue> this).$data.$state = store.getState()
    })
  }
})
