import Administration from './administration'
import Authentication from './authentication'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    administration: Administration,
    authentication: Authentication
  }
})

export default store
