/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready () {
      console.log([
        'App is being served from cache by a service worker.',
        'For more details, visit https://goo.gl/AFskqB'
      ].join('\n'))
    },
    registered () {
      console.log('Service worker has been registered')
    },
    cached () {
      console.log('Content has been cached for offline use')
    },
    updatefound () {
      console.log('New content is being downloaded')
    },
    updated () {
      const v0RegExp = /^v0.0.0-([0-9]+)-([a-z0-9]+)$/
      const matches = (window as any).globals.version.match(v0RegExp)
      if (matches !== null) {
        if (Number(matches[1]) < 409) {
          location.reload()
        }
      }
      console.log('New content is available; please refresh')
    },
    offline () {
      console.log('No internet connection found. App is running in offline mode')
    },
    error (error) {
      console.error('Error during service worker registration:', error)
    }
  })
}
