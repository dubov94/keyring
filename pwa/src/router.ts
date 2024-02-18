import Dashboard from '@/views/Dashboard.vue'
import Landing from '@/views/Landing.vue'
import LogIn from '@/views/authn/LogIn.vue'
import MailVerification from '@/views/authn/MailVerification.vue'
import Register from '@/views/authn/Register.vue'
import Portation from '@/views/portation/Index.vue'
import Security from '@/views/security/Index.vue'
import RecentSessions from '@/views/security/RecentSessions.vue'
import ThreatAnalysis from '@/views/security/ThreatAnalysis.vue'
import Settings from '@/views/settings/Index.vue'
import Vue from 'vue'
import VueRouter, { NavigationGuard } from 'vue-router'
import { store } from './redux'
import { isAuthenticated, mailVerificationRequired } from './redux/modules/user/account/selectors'

Vue.use(VueRouter)

const authenticatedGuard: NavigationGuard = (_to, _from, next) => {
  const state = store.getState()
  if (!isAuthenticated(state)) {
    next('/log-in')
  } else if (mailVerificationRequired(state)) {
    next('/mail-verification')
  } else {
    next()
  }
}

const noActiveUserGuard: NavigationGuard = (_to, _from, next) => {
  if (isAuthenticated(store.getState())) {
    next('/dashboard')
  } else {
    next()
  }
}

export const router = new VueRouter({
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
        const state = store.getState()
        if (!isAuthenticated(state)) {
          next('/log-in')
        } else if (!mailVerificationRequired(state)) {
          next('/dashboard')
        } else {
          next()
        }
      }
    }, {
      path: '/dashboard',
      component: Dashboard,
      props: { debounceMillis: 150 },
      beforeEnter: authenticatedGuard
    },
    {
      path: '/security',
      component: Security,
      redirect: '/security/threat-analysis',
      beforeEnter: authenticatedGuard,
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
      beforeEnter: authenticatedGuard
    }, {
      path: '/portation',
      component: Portation,
      beforeEnter: authenticatedGuard
    },
    {
      path: '*',
      redirect: () => '/'
    }
  ]
})
