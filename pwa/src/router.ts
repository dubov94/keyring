import Dashboard from '@/views/Dashboard.vue'
import Landing from '@/views/Landing.vue'
import LogIn from '@/views/authentication/LogIn.vue'
import RecentSessions from '@/views/security/RecentSessions.vue'
import Register from '@/views/authentication/Register.vue'
import MailVerification from '@/views/authentication/MailVerification.vue'
import Security from '@/views/security/Index.vue'
import Settings from '@/views/settings/Index.vue'
import ThreatAnalysis from '@/views/security/ThreatAnalysis.vue'
import Vue from 'vue'
import VueRouter, { NavigationGuard } from 'vue-router'
import { getStore } from '@/store/store_di'
import { FullState } from './store/state'

Vue.use(VueRouter)

const authenticationGuard: NavigationGuard = (_to, _from, next) => {
  const fullState = getStore().state as FullState
  if (!fullState.user.isAuthenticated) {
    next('/log-in')
  } else if (fullState.user.requiresMailVerification) {
    next('/mail-verification')
  } else {
    next()
  }
}

const noActiveUserGuard: NavigationGuard = (_to, _from, next) => {
  const fullState = getStore().state as FullState
  if (fullState.user.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
}

export const Router = new VueRouter({
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
      beforeEnter: (_to, _from, next) => {
        const fullState = getStore().state as FullState
        if (!fullState.user.isAuthenticated) {
          next('/log-in')
        } else if (!fullState.user.requiresMailVerification) {
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
