/** @jsxImportSource @emotion/react */

import React, { Fragment, useEffect, useState } from 'react'
import styled from '@emotion/styled'
import DoneIcon from '@mui/icons-material/Done'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import LoadingButton from '@mui/lab/LoadingButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LogoAnimation from './LogoAnimation.tsx'
import { deleteStorages, deleteCaches, deleteIndexedDb } from './wipeout.ts'

const Application = () => {
  const [storagesDone, setStoragesDone] = useState(false)
  const [cachesDone, setCachesDone] = useState(false)
  const [indexedDbDone, setIndexedDbDone] = useState(false)

  useEffect(() => {
    deleteStorages().then(() => { setStoragesDone(true) }).catch(console.error)
    // 'Because CacheStorage requires file-system access, it may be unavailable
    // in private mode in Firefox.'
    deleteCaches().catch(console.warn).finally(() => { setCachesDone(true) })
    // https://bugzilla.mozilla.org/show_bug.cgi?id=781982
    deleteIndexedDb().catch(console.warn).finally(() => { setIndexedDbDone(true) })
  }, [])

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

  const wipeoutComplete = [
    storagesDone,
    cachesDone,
    indexedDbDone
  ].every(indicator => indicator)

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
          <Grid container mt={2} spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 1 }}>
                <Typography variant="h6" gutterBottom>
                  What's happening?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  TL;DR: We are moving to{' '}
                  <Link href="https://parolica.com" target="_blank"
                    rel="noopener noreferrer">parolica.com</Link>.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Where are all my passwords now?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  They are still there, just on a new domain.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 1 }}>
                <Typography variant="h6" gutterBottom>
                  What about the data stored on this device?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  It's being wiped out. Once the operation is complete,
                  the button below will display a check mark.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 1 }}>
                <Typography variant="h6" gutterBottom>
                  I had the app installed as a{' '}
                  <Link href="https://support.google.com/chrome/answer/9658361"
                    target="_blank" rel="noopener noreferrer">PWA</Link>.
                  What do I do now?
                </Typography>
                <Typography variant="body1" gutterBottom>
                  You can remove it and reinstall from the new domain.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box mt={4} textAlign="center">
            <LoadingButton variant="contained" href="https://parolica.com"
              target="_blank" rel="noopener noreferrer"
              size="large" startIcon={<DoneIcon />}
              loading={!wipeoutComplete} loadingPosition="start">
              Go to parolica.com
            </LoadingButton>
          </Box>
          <Typography align="center" variant="body2" mt={8} gutterBottom>
            <Link href="https://streamlinehq.com/"
              target="_blank" rel="noopener noreferrer">
              Free illustrations from Streamline
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Fragment>
  )
}

export default Application
