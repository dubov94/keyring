/** @jsxImportSource @emotion/react */

import React, { Fragment } from 'react'
import styled from '@emotion/styled'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LogoAnimation from './LogoAnimation.tsx'

const Application = () => {
  const OriginalName = styled.span`
    background: #2d89ef;
    border-radius: 16px;
    color: #ffffff;
    padding: 8px 16px;
  `
  const InitialP = styled.span`
    color: #db4367;
  `
  const InitialR = styled.span`
    color: #54b5f9;
  `

  return (
    <Fragment>
      <CssBaseline />
      <Container maxWidth="lg">
        <Stack>
          <Typography variant="h2" align="center" mt={4}>
            <OriginalName>Key Ring</OriginalName>{' '}
            is now{' '}
            <InitialP>P</InitialP>a<InitialR>r</InitialR>olica!
          </Typography>
          <Box mt={2}>
            <LogoAnimation/>
          </Box>
          <Grid container mt={2} spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  What's happening?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  TL;DR: We are moving to <Link href="https://parolica.com">parolica.com</Link>.
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  What about the data stored on this device?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  TBD
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Where are all my passwords now?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  They are still there, just on a new domain.
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  I had the app installed as a{' '}
                  <Link href="https://support.google.com/chrome/answer/9658361" target="_blank"
                    rel="noopener noreferrer">PWA</Link>.
                  What do I do now?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  You can remove it and reinstall from the new domain.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box mt={4} textAlign="center">
            <Button variant="contained" href="https://parolica.com" size="large">
              Go to parolica.com
            </Button>
          </Box>
          <Typography align="center" variant="body2" mt={8} gutterBottom>
            <Link href="https://streamlinehq.com/" target="_blank"
              rel="noopener noreferrer">
              Free illustrations from Streamline
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Fragment>
  )
}

export default Application
