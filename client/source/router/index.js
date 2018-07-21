import Activate from '../components/authentication/Activate'
import Authentication from '../components/authentication/Index'
import Home from '../components/Home'
import Login from '../components/authentication/Login'
import Register from '../components/authentication/Register'
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
          path: 'login',
          component: Login
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
      path: '/',
      component: Home
    }
  ]
})

router.replace('/authentication/login')

export default router
