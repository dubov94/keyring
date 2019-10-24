import Authentication from './components/authentication/Index'
import Dashboard from './components/Dashboard'
import LogIn from './components/authentication/LogIn'
import Register from './components/authentication/Register'
import ResumeSession from './components/authentication/ResumeSession'
import SetUp from './components/authentication/SetUp'
import Security from './components/security/Index'
import Settings from './components/settings/Index'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from './store'

Vue.use(VueRouter)

const getPathOrAuthFallback = (path) => {
  if (store.getters.isUserActive) {
    return path
  } else if (store.getters['session/hasEnoughDataToResume']) {
    return '/resume-session'
  } else {
    return '/log-in'
  }
}

const activeUserGuard = (to, from, next) => {
  next(getPathOrAuthFallback(undefined))
}

const idleSessionGuard = (to, from, next) => {
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
      redirect: () => getPathOrAuthFallback('/dashboard'),
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
          beforeEnter: activeUserGuard
        },
        {
          path: 'resume-session',
          component: ResumeSession,
          beforeEnter: idleSessionGuard,
          meta: { interstitial: true }
        }
      ]
    }, {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: activeUserGuard
    }, {
      path: '/security',
      component: Security,
      beforeEnter: activeUserGuard
    }, {
      path: '/settings',
      component: Settings,
      beforeEnter: activeUserGuard
    }, {
      path: '*',
      redirect: () => '/'
    }
  ]
})

export default router
