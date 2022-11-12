// https://github.com/damianstasik/vue-svg-loader/blob/master/docs/faq.md#how-to-use-this-loader-with-typescript
declare module '*.svg' {
  import Vue, { VueConstructor } from 'vue'
  const content: VueConstructor<Vue>
  export default content
}
