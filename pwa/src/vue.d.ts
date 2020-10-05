import Vue from 'vue'
import { Subject } from 'rxjs'

declare module '*.vue' {
  export default Vue
}

declare module 'vue/types/vue' {
  interface Vue {
    beforeDestroy$: Subject<void>
  }
}
