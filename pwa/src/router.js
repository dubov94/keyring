import Dashboard from '@/views/Dashboard'
import Landing from '@/views/Landing'
import LogIn from '@/views/authentication/LogIn'
import RecentSessions from '@/views/security/RecentSessions'
import Register from '@/views/authentication/Register'
import MailVerification from '@/views/authentication/MailVerification'
import Security from '@/views/security/Index'
import Settings from '@/views/settings/Index'
import ThreatAnalysis from '@/views/security/ThreatAnalysis'
import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'

Vue.use(VueRouter)

const authenticationGuard = (to, from, next) => {
  if (!store.getters.isUserActive) {
    next('/log-in')
  } else if (store.state.requiresMailVerification) {
    next('/mail-verification')
  } else {
    next()
  }
}

const noActiveUserGuard = (to, from, next) => {
  if (store.getters.isUserActive) {
    next('/dashboard')
  } else {
    next()
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
      component: Landing
    }, {
      path: '/log-in',
      component: LogIn,
      beforeEnter: noActiveUserGuard
    }, {
      path: '/register',
      component: Register,
      beforeEnter: noActiveUserGuard
    }, {
      path: '/mail-verification',
      component: MailVerification,
      beforeEnter: (to, from, next) => {
        if (!store.getters.isUserActive) {
          next('/log-in')
        } else if (!store.state.requiresMailVerification) {
          next('/dashboard')
        } else {
          next()
        }
      }
    }, {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: authenticationGuard
    }, {
      path: '/security',
      component: Security,
      redirect: '/security/threat-analysis',
      beforeEnter: authenticationGuard,
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
      beforeEnter: authenticationGuard
    }, {
      path: '*',
      redirect: () => '/'
    }
  ]
})

export default router
