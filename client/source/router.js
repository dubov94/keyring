import Account from './components/Account'
import Activate from './components/authentication/Activate'
import Authentication from './components/authentication/Index'
import Dashboard from './components/Dashboard'
import LogIn from './components/authentication/LogIn'
import Register from './components/authentication/Register'
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'abstract',
  routes: [
    {
      path: '/authentication',
      component: Authentication,
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
          path: 'activate',
          component: Activate
        }
      ]
    }, {
      path: '/dashboard',
      component: Dashboard
    }, {
      path: '/account',
      component: Account
    }
  ]
})

router.replace('/authentication/log-in')

export default router
