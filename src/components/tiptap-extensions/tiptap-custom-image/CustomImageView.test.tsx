import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('renders the loading placeholder in the computed image frame size', () => {
    render(
      <CustomImageView
        node={{
          attrs: {
            src: '/protected/image.png',
            width: 240,
            height: 120,
            wrapMode: 'inline'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={false}
        options={{
          ...createOptions(),
          getAccessToken: () => 'token',
          isProtectedSrc: () => true,
          resolveProtectedSrc: jest.fn(() => new Promise<string>(() => undefined))
        }}
      />
    )

    expect(screen.getByTestId('document-editor-image-frame')).toHaveStyle({
      width: '240px',
      height: '120px'
    })
    expect(screen.getByTestId('document-editor-image-broken')).toHaveTextContent('Loading image...')
  })

  it('keeps the current protected image visible when selection rerenders the node view', async () => {
    let resolveProtectedImage: ((value: string) => void) | null = null
    const initialResolver = jest.fn(
      () =>
        new Promise<string>(resolve => {
          resolveProtectedImage = resolve
        })
    )

    const { rerender } = render(
      <CustomImageView
        node={{
          attrs: {
            src: '/protected/image.png',
            width: 120,
            height: 80,
            wrapMode: 'inline'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={false}
        options={{
          ...createOptions(),
          getAccessToken: () => 'token',
          isProtectedSrc: () => true,
          resolveProtectedSrc: initialResolver
        }}
      />
    )

    resolveProtectedImage?.(BASE64_IMAGE)
    await waitFor(() => expect(screen.getByTestId('document-editor-image')).toHaveAttribute('src', BASE64_IMAGE))

    rerender(
      <CustomImageView
        node={{
          attrs: {
            src: '/protected/image.png',
            width: 120,
            height: 80,
            wrapMode: 'inline'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={true}
        options={{
          ...createOptions(),
          getAccessToken: () => 'token',
          isProtectedSrc: () => true,
          resolveProtectedSrc: jest.fn(() => new Promise<string>(() => undefined))
        }}
      />
    )

    expect(screen.queryByTestId('document-editor-image-broken')).not.toBeInTheDocument()
    expect(screen.getByTestId('document-editor-image')).toHaveAttribute('src', BASE64_IMAGE)
  })
})
