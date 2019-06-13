import Authentication from './components/authentication/Index'
import Dashboard from './components/Dashboard'
import LogIn from './components/authentication/LogIn'
import Register from './components/authentication/Register'
import ResumeSession from './components/authentication/ResumeSession'
import SetUp from './components/authentication/SetUp'
import Settings from './components/settings/Index'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from './store'

Vue.use(VueRouter)

const sessionTokenPresenceGuard = (to, from, next) => {
  if (store.getters.isUserActive) {
    next()
  } else if (store.getters['session/hasEnoughDataToResume']) {
    next('/resume-session')
  } else {
    next('/log-in')
  }
}

const sessionResumptionDataGuard = (to, from, next) => {
  if (store.getters['session/hasEnoughDataToResume']) {
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
      redirect: () => store.getters.isUserActive ? '/dashboard' : '/log-in',
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
          beforeEnter: sessionTokenPresenceGuard
        },
        {
          path: 'resume-session',
          component: ResumeSession,
          beforeEnter: sessionResumptionDataGuard
        }
      ]
    }, {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: sessionTokenPresenceGuard
    }, {
      path: '/settings',
      component: Settings,
      beforeEnter: sessionTokenPresenceGuard
    }, {
      path: '*',
      redirect: () => '/'
    }
  ]
})

export default router
