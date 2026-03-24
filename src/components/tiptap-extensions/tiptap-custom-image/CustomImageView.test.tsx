import React from 'react'
import { render, screen } from '@testing-library/react'
import { CustomImageView } from './CustomImageView'

jest.mock('@tiptap/react', () => {
  const actualReact = jest.requireActual('react') as typeof import('react')

  return {
    NodeViewWrapper: actualReact.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    ))
  }
})

function createOptions() {
  return {
    defaultAlign: 'left' as const,
    defaultWrapMode: 'inline' as const,
    defaultAnchorMode: 'inline' as const,
    defaultDisplay: 'inline' as const,
    defaultDistance: 0,
    getAccessToken: () => '',
    isProtectedSrc: () => false,
    resolveProtectedSrc: undefined,
    minSize: 40
  }
}

const BASE64_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII='

describe('CustomImageView', () => {
  it('floats square-right images on the right', () => {
    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'square-right',
            align: 'right'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={false}
        options={createOptions()}
      />
    )

    expect(screen.getByTestId('document-editor-image-anchor')).toHaveStyle({
      float: 'right'
    })
  })

  it('treats top and bottom wrapping as a movable floating mode', () => {
    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'top-bottom',
            align: 'center'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={true}
        options={createOptions()}
      />
    )

    expect(screen.getByTestId('document-editor-image-anchor')).toHaveStyle({
      clear: 'both'
    })
    expect(screen.getByTestId('document-editor-image-frame').className).toContain('gba:cursor-move')
  })
})
