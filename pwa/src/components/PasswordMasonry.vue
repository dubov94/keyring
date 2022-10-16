<style scoped>
  .bricks-enter {
    opacity: 0;
  }

  .bricks-enter-active, .bricks-move {
    transition: opacity 0.25s, transform 0.25s;
  }

  .bricks-leave-active {
    display: none;
  }
</style>

<template>
  <v-row>
    <transition-group name="bricks" tag="div" class="flex-1" :style="listStyles">
      <v-lazy :min-height="128" v-for="(item, index) in items" :key="item.name"
        class="pa-3" :style="itemStyles(index)">
        <password :debounce-millis="200" :clique="item" :scoreColor="idToScore[item.name]"
          @save="finalize(item.name, true)" @delete="finalize(item.name, false)"
          @cancel="finalize(item.name)" :init-edit="additions.includes(item.name)">
        </password>
      </v-lazy>
    </transition-group>
  </v-row>
</template>

<script lang="ts">
import { function as fn, array, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue, { PropType } from 'vue'
import { Color } from '@/cryptography/strength_test_service'
import { Clique, createEmptyClique } from '@/redux/modules/user/keys/selectors'
import PasswordComponent from './Password.vue'

export default Vue.extend({
  components: {
    password: PasswordComponent
  },
  props: {
    additions: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    cliques: {
      type: Array as PropType<DeepReadonly<Clique>[]>,
      default: () => []
    },
    idToScore: {
      type: Object as PropType<{ [key: string]: Color }>,
      default: () => ({})
    }
  },
  computed: {
    items (): DeepReadonly<Clique[]> {
      const source = [
        ...this.additions.map((addition) => fn.pipe(
          this.cliques,
          array.findFirst((clique: DeepReadonly<Clique>) => clique.name === addition),
          option.getOrElse(() => createEmptyClique(addition))
        )),
        ...this.cliques.filter((clique) => !this.additions.includes(clique.name))
      ]
      const result: DeepReadonly<Clique>[] = []
      for (let bucket = 0; bucket < this.columnCount; ++bucket) {
        for (let index = bucket; index < source.length; index += this.columnCount) {
          result.push(source[index])
        }
      }
      return result
    },
    columnCount (): number {
      if (this.$vuetify.breakpoint.lgAndUp) {
        return 3
      }
      if (this.$vuetify.breakpoint.mdOnly) {
        return 2
      }
      return 1
    },
    height (): number {
      return Math.ceil(this.items.length / this.columnCount)
    },
    fullColumns (): number {
      const mod = this.items.length % this.columnCount
      return mod === 0 ? this.columnCount : mod
    },
    cellsInFull (): number {
      return this.fullColumns * this.height
    },
    listStyles (): { [key: string]: string } {
      return {
        // Prevents width expansion on scrolling.
        width: '100%',
        columns: String(this.columnCount),
        columnGap: '0'
      }
    }
  },
  methods: {
    itemStyles (index: number): { [key: string]: string } {
      return {
        'break-after': (index >= this.cellsInFull
          ? (index - this.cellsInFull + 1) % (this.height - 1) === 0
          : (index + 1) % this.height === 0) ? 'column' : 'auto',
        'break-inside': 'avoid',
        // Firefox still breaks single item by default.
        overflow: 'hidden'
      }
    },
    finalize (cliqueName: string, attach: boolean) {
      if (this.additions.includes(cliqueName)) {
        this.$emit('addition', cliqueName, attach)
      }
    }
  }
})
</script>
