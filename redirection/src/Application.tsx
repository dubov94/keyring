import React, { Fragment } from 'react'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LogoAnimation from './LogoAnimation.tsx'

const Application = () => {
  return (
    <Fragment>
      <CssBaseline />
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Typography variant="h1" align="center">
            Graduation! 🎉
          </Typography>
          <LogoAnimation />
          <Typography align="center">
            <a href="https://streamlinehq.com/" target="_blank"
              rel="noopener noreferrer">
              Free illustrations from Streamline
            </a>
          </Typography>
        </Stack>
      </Container>
    </Fragment>
  )
}

export default Application
