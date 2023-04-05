import last from 'lodash/last'
import Vue, { ComponentOptions, VueConstructor } from 'vue'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import { Store } from '@reduxjs/toolkit'
import { createLocalVue, Wrapper } from '@vue/test-utils'
import FormTextField from '@/components/FormTextField.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import { Future, newFuture } from '@/future'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'

Vue.use(Vuetify)
;(globalThis as any).requestAnimationFrame = (callback: () => void) => callback()

export const setUpLocalVue = (): VueConstructor<Vue> => {
  const localVue = createLocalVue()
  localVue.use(Vuelidate)
  localVue.component('form-text-field', FormTextField)
  localVue.component('external-link', ExternalLink)
  return localVue
}

export const setUpVuetify = () => new Vuetify()

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

  getTailLength (): number {
    return this.queue.length - this.index - 1
  }
}

export const drainActionQueue = async (actionQueue: ActionQueue) => {
  const actions = []
  while (actionQueue.getTailLength() > 0) {
    actions.push(await actionQueue.dequeue())
  }
  return actions
}

export const setUpTranslationMixin = (mapper: (key: string) => string): ComponentOptions<Vue> => ({
  methods: {
    $t (key: string): string {
      return mapper(key)
    }
  }
})

export const setUpStateMixin = (
  store: Store<RootState, RootAction>,
  actionQueue: ActionQueue
): ComponentOptions<Vue> => ({
  data () {
    return {
      $state: store.getState()
    }
  },
  created () {
    store.subscribe(() => {
      ;(<Vue> this).$data.$state = store.getState()
    })
  },
  methods: {
    dispatch (action: RootAction) {
      actionQueue.enqueue(action)
    }
  }
})

export const getValue = (wrapper: Wrapper<Vue>) => {
  return (<HTMLInputElement>wrapper.element).value
}

export const tickUntilTrue = async (condition: () => boolean) => {
  while (!condition()) {
    await Vue.nextTick()
  }
}

export const setUpExpansionPanelProviders = () => ({
  expansionPanels: {
    register: () => {},
    unregister: () => {}
  }
})
