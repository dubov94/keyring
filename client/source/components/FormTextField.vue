<template>
  <v-text-field :value="value" :type="type" :label="label"
    :prepend-icon="prependIcon" :autofocus="autofocus"
    :error-messages="errorMessages" @blur="touch" @keydown.native.enter="touch"
    @focus="reset" @input="input"></v-text-field>
</template>

<script>
  export default {
    props: [
      'autofocus',
      'dirty',
      'errors',
      'label',
      'prependIcon',
      'type',
      'value'
    ],
    data () {
      return {
        dirtyInternal: this.dirty,
        ignoreEvents: !this.dirty
      }
    },
    methods: {
      touch () {
        if (!this.ignoreEvents) {
          this.dirtyInternal = true
          this.$emit('touch')
        }
      },
      reset () {
        if (!this.ignoreEvents) {
          this.dirtyInternal = false
          this.$emit('reset')
        }
      },
      input (value) {
        this.reset()
        this.$emit('input', value)
      }
    },
    computed: {
      errorMessages () {
        if (this.dirty) {
          return Object.entries(this.errors)
            .filter(([key, value]) => value)
            .map(([key, value]) => key)
        } else {
          return []
        }
      }
    },
    watch: {
      dirty (value) {
        if (value !== this.dirtyInternal) {
          this.dirtyInternal = value
          this.ignoreEvents = !value
        }
      }
    }
  }
</script>
