import Vue from 'vue'
import { AnyAction } from '@reduxjs/toolkit'

declare module '*.vue' {
  export default Vue
}

declare module 'vue/types/vue' {
  interface Vue {
    dispatch (action: AnyAction): void;
  }
}
