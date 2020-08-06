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

Vue.use(VueRouter)

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
      component: LogIn
    }, {
      path: '/register',
      component: Register
    }, {
      path: '/set-up',
      component: SetUp
    }, {
      path: '/dashboard',
      component: Dashboard
    }, {
      path: '/security',
      component: Security,
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
      component: Settings
    }, {
      path: '*',
      redirect: () => '/'
    }
  ]
})

export default router
