/**
 * Regression: PremiumHeroWavingDotsCanvas must not throw when
 * `(prefers-reduced-motion: reduce)` is true — stamps must be ready before `drawFrame(0)`.
 *
 * Manual verification (any screen using PremiumHeroBackground, e.g. customer-home or EveryOne dashboard):
 * - macOS: System Settings → Accessibility → Display → Reduce Motion → On, then reload the app.
 * - Windows: Settings → Accessibility → Visual effects → Animation effects → Off, then reload.
 * - Console: `matchMedia('(prefers-reduced-motion: reduce)').matches` should be `true` while testing.
 */

import React from 'react'
import { act, render } from '@testing-library/react'
import { PremiumHeroWavingDotsCanvas } from './PremiumHeroWavingDotsCanvas'

function createFake2dContext() {
  return {
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    globalAlpha: 1,
    drawImage: jest.fn(),
    fillStyle: '',
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn()
  }
}

function mediaQueryList(matches: boolean, media: string) {
  return {
    matches,
    media,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }
}

describe('PremiumHeroWavingDotsCanvas', () => {
  let getContextSpy: jest.SpyInstance

  beforeEach(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(contextId => {
      if (contextId === '2d') {
        return createFake2dContext() as unknown as CanvasRenderingContext2D
      }
      return null
    })
  })

  afterEach(() => {
    getContextSpy.mockRestore()
  })

  it('does not throw when prefers-reduced-motion is reduce (static frame)', () => {
    window.matchMedia = jest
      .fn()
      .mockImplementation((query: string) => mediaQueryList(query === '(prefers-reduced-motion: reduce)', query))

    expect(() => {
      act(() => {
        render(
          <div style={{ width: 320, height: 240 }}>
            <PremiumHeroWavingDotsCanvas />
          </div>
        )
      })
    }).not.toThrow()
  })

  it('schedules requestAnimationFrame when reduced motion is off', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => mediaQueryList(false, query))

    const rafSpy = jest.spyOn(window, 'requestAnimationFrame')

    act(() => {
      render(
        <div style={{ width: 320, height: 240 }}>
          <PremiumHeroWavingDotsCanvas />
        </div>
      )
    })

    expect(rafSpy).toHaveBeenCalled()
    rafSpy.mockRestore()
  })
})
