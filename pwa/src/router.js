import Authentication from '@/views/authentication/Index'
import Dashboard from '@/views/Dashboard'
import Landing from '@/views/Landing'
import LogIn from '@/views/authentication/LogIn'
import RecentSessions from '@/views/security/RecentSessions'
import Register from '@/views/authentication/Register'
import SetUp from '@/views/authentication/SetUp'
import Security from '@/views/security/Index'
import Settings from '@/views/settings/Index'
import ThreatAnalysis from '@/views/security/ThreatAnalysis'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'

Vue.use(VueRouter)

const getPathOrAuthFallback = (path, fallback) => {
  if (store.getters.isUserActive) {
    return path
  } else {
    return '/log-in'
  }
}

const activeUserGuard = (to, from, next) => {
  next(getPathOrAuthFallback(undefined))
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
      component: Landing
    }, {
      path: '/log-in',
      component: Authentication,
      children: [{ path: '', component: LogIn }]
    }, {
      path: '/register',
      component: Authentication,
      children: [{ path: '', component: Register }]
    }, {
      path: '/set-up',
      component: Authentication,
      children: [{ path: '', component: SetUp }]
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
