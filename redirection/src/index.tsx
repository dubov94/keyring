import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import '@fontsource/roboto'
import './index.css'
import Application from './Application.tsx'

const theme = createTheme({
  palette: {
    background: {
      default: '#e3f2fd'
    }
  }
})

const rootElement: HTMLElement = document.getElementById('root')!
const reactRoot = ReactDOM.createRoot(rootElement)
reactRoot.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Application />
    </ThemeProvider>
  </React.StrictMode>
)
