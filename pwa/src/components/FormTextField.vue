<template>
  <v-text-field :value="value" :type="type" :label="label" :disabled="disabled"
    :prepend-icon="prependIcon" :autofocus="autofocus" ref="input" :solo="solo"
    :error-messages="errorMessages" @blur="touch" @keydown.native.enter="touch"
    @focus="reset" @input="input" :append-icon="appendIcon" :error="error"
    :aria-label="label" :hide-details="Boolean(hideDetails)" autocomplete="off"
    v-on="extraListeners" :height="height">
  </v-text-field>
</template>

<script>
export default {
  props: [
    'appendIcon',
    'appendEvent',
    'autofocus',
    'disabled',
    'dirty',
    'height',
    'hideDetails',
    'invalid',
    'errors',
    'label',
    'prependIcon',
    'prependEvent',
    'solo',
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
    input (event) {
      this.reset()
      this.$emit('input', event)
    },
    focus () {
      this.$refs.input.focus()
    }
  },
  computed: {
    errorMessages () {
      if (this.dirty) {
        return Object.entries(this.errors || {})
          .filter(([, value]) => value)
          .map(([key]) => key)
      } else {
        return []
      }
    },
    error () {
      return this.dirtyInternal && (
        this.invalid || this.errorMessages.length > 0)
    },
    extraListeners () {
      const nameToListener = {}
      if (this.appendEvent) {
        nameToListener['click:append'] = (event) => this.$emit('click:append', event)
      }
      if (this.prependEvent) {
        nameToListener['click:prepend'] = (event) => this.$emit('click:prepend', event)
      }
      return nameToListener
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
