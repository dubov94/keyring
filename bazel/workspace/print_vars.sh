#!/usr/bin/env bash

# https://git-scm.com/docs/git-describe#_description
echo STABLE_GIT_REVISION $(git describe --always)
# Earliest acceptable version.
echo STABLE_MRGN_REVISION 'v0.0.0-0-g0000000'
