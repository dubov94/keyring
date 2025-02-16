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
      <v-lazy :min-height="passwordMinHeight" class="pa-3" :style="itemStyles(index)"
        v-for="(item, index) in items" :key="item.name">
        <password :debounce-millis="200" :clique="item" :scoreColor="idToScore[item.name]"
          @save="finalize(item.name, true)" @delete="finalize(item.name, false)"
          @cancel="finalize(item.name)" :init-edit="additions.includes(item.name)"
          :editable="editable">
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
import { PASSWORD_MIN_HEIGHT } from './dimensions'

export default Vue.extend({
  components: {
    password: PasswordComponent
  },
  props: {
    additions: {
      type: Array as PropType<string[]>,
      default: () => [] as string[]
    },
    cliques: {
      type: Array as PropType<DeepReadonly<Clique>[]>,
      default: () => [] as DeepReadonly<Clique>[]
    },
    idToScore: {
      type: Object as PropType<{ [key: string]: Color }>,
      default: () => ({})
    },
    editable: {
      type: Boolean,
      default: true
    },
    colCountLg: {
      type: Number,
      default: 3
    },
    colCountMd: {
      type: Number,
      default: 2
    }
  },
  data () {
    return {
      passwordMinHeight: PASSWORD_MIN_HEIGHT
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
        return this.colCountLg
      }
      if (this.$vuetify.breakpoint.mdAndUp) {
        return this.colCountMd
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
      const mustBreak = index >= this.cellsInFull
        ? (index - this.cellsInFull + 1) % (this.height - 1) === 0
        : (index + 1) % this.height === 0
      // https://caniuse.com/mdn-css_properties_break-after_column
      const breakValue = CSS.supports('break-after', 'column')
        ? 'column' : 'always'
      return {
        breakAfter: mustBreak ? breakValue : 'auto',
        breakInside: 'avoid',
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
