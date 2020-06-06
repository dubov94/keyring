import Authentication from '@/views/authentication/Index'
import Dashboard from '@/views/Dashboard'
import LogIn from '@/views/authentication/LogIn'
import RecentSessions from '@/views/security/RecentSessions'
import Register from '@/views/authentication/Register'
import ResumeSession from '@/views/authentication/ResumeSession'
import SetUp from '@/views/authentication/SetUp'
import Security from '@/views/security/Index'
import Settings from '@/views/settings/Index'
import ThreatAnalysis from '@/views/security/ThreatAnalysis'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'

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
  base: process.env.BASE_URL,
  scrollBehavior () {
    return { x: 0, y: 0 }
  },
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
      beforeEnter: activeUserGuard,
      redirect: '/security/threat-analysis',
      children: [
        {
          path: 'recent-sessions',
          component: RecentSessions
        }, {
          path: 'threat-analysis',
          component: ThreatAnalysis
        }
      ]
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
