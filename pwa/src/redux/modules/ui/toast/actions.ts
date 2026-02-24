import { createAction } from 'typesafe-actions'
import { DeepReadonly } from 'ts-essentials'

export const showToast = createAction('ui/toast/show')<DeepReadonly<{
  message: string;
  timeout?: number;
}>>()
export const toastReadyToBeShown = createAction('ui/toast/readyToBeShown')<DeepReadonly<{
  message: string;
  timeout: number;
}>>()
export const hideToast = createAction('ui/toast/hide')()
export const navigateTo = createAction('ui/navigateTo')<string>()
