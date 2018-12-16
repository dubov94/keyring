import Settings from './components/settings/Index'
import SetUp from './components/authentication/SetUp'
import Authentication from './components/authentication/Index'
import Dashboard from './components/Dashboard'
import LogIn from './components/authentication/LogIn'
import Register from './components/authentication/Register'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from './store'

Vue.use(VueRouter)

const tokenGuard = (to, from, next) => {
  if (store.getters.hasSessionKey) {
    next()
  } else {
    next('/log-in')
  }
}

const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/',
      component: Authentication,
      redirect: () => store.getters.hasSessionKey ? '/dashboard' : '/log-in',
      children: [
        {
          path: 'log-in',
          component: LogIn
        },
        {
          path: 'register',
          component: Register
        },
        {
          path: 'set-up',
          component: SetUp,
          beforeEnter: tokenGuard
        }
      ]
    }, {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: tokenGuard
    }, {
      path: '/settings',
      component: Settings,
      beforeEnter: tokenGuard
    }, {
      path: '*',
      redirect: () => '/'
    }
  ]
})

export default router
