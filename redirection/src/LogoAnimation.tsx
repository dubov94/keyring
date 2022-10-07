/** @jsxImportSource @emotion/react */

import React, { useEffect, useRef } from 'react'
import OriginalSvg from './original.svg'
import ParolicaSvg from './parolica.svg'
import { css } from '@emotion/react'
import { gsap } from 'gsap'

const LogoAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  const imageHeightPx = 64
  const jumpHeightPx = 64
  const inflationFactor = 2

  const inflationSurplusPx = imageHeightPx * (inflationFactor - 1)
  const limitStyles = css`
    padding-top: ${Math.max(inflationSurplusPx / 2, jumpHeightPx)}px;
    padding-bottom: ${inflationSurplusPx / 2}px;
  `
  const containerStyles = css`
    position: relative;
    height: ${imageHeightPx}px;
  `
  const logoPillarStyles = css`
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  `
  const logoShellStyles = css`
    img {
      display: block;
      height: ${imageHeightPx}px;
    }
  `

  useEffect(() => {
    const context = gsap.context(() => {
      const tl = gsap.timeline()
      // Prevents `scaleY` artefacts in Firefox.
      tl.set('.original__shell', { rotate: -1 })

      tl.to('.original__shell', { duration: 1 / 4, scaleY: 5 / 6, delay: 1 / 2 })
      tl.to('.original__image', {
        duration: 1 / 2,
        y: -32,
        ease: 'power1.out',
        repeat: 1,
        yoyo: true
      })
      tl.to('.original__shell', { duration: 1 / 4, scaleY: 1 }, '<')

      tl.to('.original__shell', { duration: 1 / 8, scaleY: 5 / 6 })
      tl.to('.original__image', {
        duration: 1 / 2,
        y: -64,
        ease: 'power1.out',
        repeat: 1,
        yoyo: true
      })
      tl.to('.original__shell', { duration: 1 / 8, scaleY: 1 }, '<')

      tl.to('.original__image', { duration: 1 / 2, y: -jumpHeightPx, ease: 'power2.out' })
      tl.to('.original__image', { duration: 1 / 2, x: -64, ease: 'none' }, '<')
      tl.to('.original__image', { duration: 1 / 2, y: 0, ease: 'power2.in' })
      tl.to('.original__image', { duration: 1 / 2, x: -64 * 2, ease: 'none' }, '<')
      tl.to('.original__image', { duration: 1, rotate: 2 * -360, ease: 'none' }, '>-1')

      tl.to('.original__image', { duration: 1 / 2, y: -jumpHeightPx, ease: 'power1.out' })
      tl.to('.original__image', { duration: 1 / 2, x: 0, ease: 'none' }, '<')
      tl.to('.original__image', { duration: 1 / 2, y: 0, ease: 'power1.in' })
      tl.to('.original__image', { duration: 1 / 2, x: 64 * 2, ease: 'none' }, '<')
      tl.to('.original__image', { duration: 1, rotate: 360, ease: 'none' }, '>-1')

      tl.to('.original__image', { duration: 1 / 4, y: -jumpHeightPx, ease: 'power2.out' })
      tl.to('.original__image', { duration: 1 / 4, x: 64, ease: 'none' }, '<')
      tl.to('.original__image', { duration: 1 / 4, y: -9, ease: 'power2.in' })
      tl.to('.original__image', { duration: 1 / 4, x: -9, ease: 'none' }, '<')
      tl.to('.original__image', {
          duration: 1 / 2,
          rotate: 2 * -360,
          scale: 1 / 3,
          ease: 'none'
      }, '>-0.5')
      tl.to('.original__image', { duration: 1 / 4, opacity: 0 })

      tl.to('.parolica__image', {
        duration: 1 / 2,
        scale: inflationFactor,
        opacity: 1
      }, '<-0.5')
      tl.to('.parolica__image', {
        duration: 1 / (4 * 8),
        rotateX: 30,
        repeat: 8,
        yoyo: true
      })
      tl.to('.parolica__image', {
        duration: 1 / 4,
        scale: 1 + 1 / 2,
        ease: 'back.out(4)'
      })
    }, containerRef)

    return () => {
      context.revert()
    }
  }, [])

  return (
    <div css={limitStyles}>
      <div css={containerStyles} ref={containerRef}>
        <div css={logoPillarStyles}>
          <div className="original__shell" css={css`
            ${logoShellStyles};
            transform-origin: 50% 100%;
          `}>
            <img className="original__image" src={OriginalSvg} />
          </div>
        </div>
        <div css={logoPillarStyles}>
          <div className="parolica__shell" css={logoShellStyles}>
            <img className="parolica__image" src={ParolicaSvg}
              css={css`opacity: 0;`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogoAnimation
