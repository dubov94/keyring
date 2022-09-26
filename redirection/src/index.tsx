import React from 'react'
import ReactDOM from 'react-dom/client'

import '@fontsource/roboto'
import './index.css'
import Application from './Application.tsx'

const rootElement: HTMLElement = document.getElementById('root')!
const reactRoot = ReactDOM.createRoot(rootElement)
reactRoot.render(
  <React.StrictMode>
    <Application></Application>
  </React.StrictMode>
)
