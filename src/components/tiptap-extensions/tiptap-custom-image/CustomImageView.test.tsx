import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CustomImageView } from './CustomImageView'

jest.mock('@tiptap/react', () => {
  const actualReact = jest.requireActual('react') as typeof import('react')

  return {
    NodeViewWrapper: actualReact.forwardRef<HTMLElement, any>(({ as: Tag = 'div', children, ...props }, ref) => (
      <Tag ref={ref} {...props}>
        {children}
      </Tag>
    ))
  }
})

const mockCreateNodeSelection = jest.fn(() => ({ type: 'node-selection' }))

jest.mock('@tiptap/pm/state', () => ({
  NodeSelection: {
    create: (...args: unknown[]) => mockCreateNodeSelection(...args)
  }
}))

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

function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left ?? 0,
      y: rect.top,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left ?? 0,
      right: rect.right ?? 100,
      width: (rect.right ?? 100) - (rect.left ?? 0),
      height: rect.bottom - rect.top,
      toJSON: () => ({})
    })
  })
}

describe('CustomImageView', () => {
  it('renders right-only square images locally and floats the paragraph anchor', () => {
    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'square',
            wrapTextSide: 'left',
            align: 'right'
          }
        }}
        editor={null}
        getPos={() => 1}
        selected={false}
        options={createOptions()}
      />
    )

    expect(screen.getByTestId('document-editor-image-anchor').tagName).toBe('SPAN')
    expect(screen.getByTestId('document-editor-image-anchor')).toHaveStyle({
      float: 'right'
    })
    expect(screen.getByTestId('document-editor-image-anchor')).toHaveAttribute('data-image-render-mode', 'local')
    expect(screen.getByTestId('document-editor-image-figure')).toBeInTheDocument()
    expect(screen.queryByTestId('document-editor-image-flow-shim')).toBeNull()
  })

  it('keeps square images inside the paragraph DOM', () => {
    render(
      <p data-testid="image-paragraph">
        prefix
        <CustomImageView
          node={{
            attrs: {
              src: BASE64_IMAGE,
              width: 120,
              height: 80,
              wrapMode: 'square',
              wrapTextSide: 'left',
              align: 'right'
            }
          }}
          editor={null}
          getPos={() => 5}
          selected={false}
          options={createOptions()}
        />
      </p>
    )

    const paragraph = screen.getByTestId('image-paragraph')
    const anchor = screen.getByTestId('document-editor-image-anchor')
    const figure = screen.getByTestId('document-editor-image-figure')

    expect(paragraph.contains(anchor)).toBe(true)
    expect(paragraph.contains(figure)).toBe(true)
    expect(screen.queryByTestId('document-editor-image-flow-shim')).toBeNull()
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

    expect(screen.getByTestId('document-editor-image-flow-shim')).toHaveStyle({
      width: '100%'
    })
    expect(screen.getByTestId('document-editor-image-frame').className).toContain('gba:cursor-move')
  })

  it('renders behind-text images into the matching page overlay layer', async () => {
    const editorDom = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const behindLayer = document.createElement('div')

    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    behindLayer.className = 'rm-page-image-overlay-layer'
    behindLayer.dataset.rmPageNumber = '1'
    behindLayer.dataset.rmImageLayer = 'behind'

    editorDom.append(bodyLayer, behindLayer)
    document.body.appendChild(editorDom)

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(bodyLayer, { top: 0, bottom: 320 })
    setRect(behindLayer, { top: 0, bottom: 320 })

    const { container } = render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'behind',
            anchorMode: 'move-with-text'
          }
        }}
        editor={
          {
            view: {
              dom: editorDom
            }
          } as never
        }
        getPos={() => 1}
        selected={false}
        options={createOptions()}
      />
    )

    const anchor = screen.getByTestId('document-editor-image-anchor')
    setRect(anchor, { top: 48, bottom: 48 })
    editorDom.style.setProperty('--overlay-refresh', '1')

    await waitFor(() => {
      expect(behindLayer.querySelector('[data-testid="document-editor-image-figure"]')).not.toBeNull()
    })

    const behindFigure = behindLayer.querySelector('[data-testid="document-editor-image-figure"]') as HTMLElement
    expect(behindFigure.style.pointerEvents).toBe('none')
    expect(behindFigure.style.zIndex).toBe('0')

    expect(anchor).toHaveAttribute('data-image-render-mode', 'overlay')
    expect(container.querySelector('[data-testid="document-editor-image-figure"]')).toBeNull()
  })

  it('renders in-front-of-text images into the matching page overlay layer', async () => {
    const editorDom = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const frontLayer = document.createElement('div')

    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    frontLayer.className = 'rm-page-image-overlay-layer'
    frontLayer.dataset.rmPageNumber = '1'
    frontLayer.dataset.rmImageLayer = 'front'

    editorDom.append(bodyLayer, frontLayer)
    document.body.appendChild(editorDom)

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(bodyLayer, { top: 0, bottom: 320 })
    setRect(frontLayer, { top: 0, bottom: 320 })

    const { container } = render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'front',
            anchorMode: 'move-with-text'
          }
        }}
        editor={
          {
            view: {
              dom: editorDom
            }
          } as never
        }
        getPos={() => 1}
        selected={false}
        options={createOptions()}
      />
    )

    const anchor = screen.getByTestId('document-editor-image-anchor')
    setRect(anchor, { top: 48, bottom: 48 })
    editorDom.style.setProperty('--overlay-refresh', '3')

    await waitFor(() => {
      expect(frontLayer.querySelector('[data-testid="document-editor-image-figure"]')).not.toBeNull()
    })

    const frontFigure = frontLayer.querySelector('[data-testid="document-editor-image-figure"]') as HTMLElement
    expect(frontFigure.style.pointerEvents).toBe('auto')

    expect(anchor).toHaveAttribute('data-image-render-mode', 'overlay')
    expect(container.querySelector('[data-testid="document-editor-image-figure"]')).toBeNull()
  })

  it('anchors move-with-text overlay images to the paragraph rather than the inline marker', async () => {
    const editorDom = document.createElement('div')
    const bodyLayer = document.createElement('div')
    const behindLayer = document.createElement('div')

    bodyLayer.className = 'rm-page-body-layer'
    bodyLayer.dataset.rmPageNumber = '1'
    behindLayer.className = 'rm-page-image-overlay-layer'
    behindLayer.dataset.rmPageNumber = '1'
    behindLayer.dataset.rmImageLayer = 'behind'

    editorDom.append(bodyLayer, behindLayer)
    document.body.appendChild(editorDom)

    Object.defineProperty(editorDom, 'scrollTop', { configurable: true, value: 0 })
    setRect(editorDom, { top: 0, bottom: 400, left: 0, right: 400 })
    setRect(bodyLayer, { top: 0, bottom: 320, left: 0, right: 320 })
    setRect(behindLayer, { top: 0, bottom: 320, left: 0, right: 320 })

    render(
      <p data-testid="anchor-paragraph">
        prefix
        <CustomImageView
          node={{
            attrs: {
              src: BASE64_IMAGE,
              width: 120,
              height: 80,
              wrapMode: 'behind',
              anchorMode: 'move-with-text'
            }
          }}
          editor={
            {
              view: {
                dom: editorDom
              }
            } as never
          }
          getPos={() => 1}
          selected={false}
          options={createOptions()}
        />
      </p>
    )

    const paragraph = screen.getByTestId('anchor-paragraph')
    const anchor = screen.getByTestId('document-editor-image-anchor')
    setRect(paragraph, { top: 24, bottom: 120, left: 0, right: 320 })
    setRect(anchor, { top: 92, bottom: 92, left: 0, right: 0 })
    editorDom.style.setProperty('--overlay-refresh', '4')

    await waitFor(() => {
      expect(behindLayer.querySelector('[data-testid="document-editor-image-figure"]')).not.toBeNull()
    })

    expect((behindLayer.querySelector('[data-testid="document-editor-image-figure"]') as HTMLElement).style.top).toBe(
      '24px'
    )
  })

  it('does not crash when overlay images render before the editor view mounts', () => {
    const editor = {
      get view() {
        throw new Error('view not mounted yet')
      }
    }

    expect(() =>
      render(
        <CustomImageView
          node={{
            attrs: {
              src: BASE64_IMAGE,
              width: 120,
              height: 80,
              wrapMode: 'behind',
              anchorMode: 'move-with-text'
            }
          }}
          editor={editor as never}
          getPos={() => 1}
          selected={false}
          options={createOptions()}
        />
      )
    ).not.toThrow()

    expect(screen.getByTestId('document-editor-image-anchor')).toBeInTheDocument()
  })

  it('selects square images through the paragraph-rendered figure', async () => {
    const tr = {
      setSelection: jest.fn(function setSelection() {
        return this
      })
    }
    const dispatch = jest.fn()
    const focus = jest.fn()

    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 120,
            height: 80,
            wrapMode: 'square',
            wrapTextSide: 'left',
            align: 'right'
          }
        }}
        editor={
          {
            state: {
              doc: {
                nodeAt: () => ({ type: { name: 'image' }, attrs: {} })
              },
              tr
            },
            view: {
              dom: document.createElement('div'),
              dispatch,
              focus
            }
          } as never
        }
        getPos={() => 1}
        selected={false}
        options={createOptions()}
      />
    )

    fireEvent.click(screen.getByTestId('document-editor-image-figure'))

    expect(mockCreateNodeSelection).toHaveBeenCalledWith(expect.anything(), 1)
    expect(tr.setSelection).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith(tr)
    expect(focus).toHaveBeenCalled()
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

  it('does not dispatch dimension updates on load when original dimensions already exist', async () => {
    const dispatch = jest.fn()
    const setNodeMarkup = jest.fn(() => ({ doc: {} }))
    const tr = { setNodeMarkup }

    const editor = {
      state: {
        doc: {
          nodeAt: () => ({
            type: { name: 'image' },
            attrs: {
              src: BASE64_IMAGE,
              width: 50,
              height: 50,
              originalWidth: 10,
              originalHeight: 10
            }
          })
        },
        tr
      },
      view: { dispatch }
    }

    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 50,
            height: 50,
            originalWidth: 10,
            originalHeight: 10,
            wrapMode: 'inline'
          }
        }}
        editor={editor as never}
        getPos={() => 2}
        selected={false}
        options={createOptions()}
      />
    )

    const img = await screen.findByTestId('document-editor-image')
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 999 })
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 999 })
    fireEvent.load(img)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('backfills missing original dimensions on load', async () => {
    const dispatch = jest.fn()
    const setNodeMarkup = jest.fn(() => ({ doc: {} }))
    const tr = { setNodeMarkup }

    const editor = {
      state: {
        doc: {
          nodeAt: () => ({
            type: { name: 'image' },
            attrs: {
              src: BASE64_IMAGE,
              width: 50,
              height: 50,
              originalWidth: null,
              originalHeight: null
            }
          })
        },
        tr
      },
      view: { dispatch }
    }

    render(
      <CustomImageView
        node={{
          attrs: {
            src: BASE64_IMAGE,
            width: 50,
            height: 50,
            wrapMode: 'inline'
          }
        }}
        editor={editor as never}
        getPos={() => 2}
        selected={false}
        options={createOptions()}
      />
    )

    const img = await screen.findByTestId('document-editor-image')
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1 })
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 1 })
    fireEvent.load(img)
    expect(dispatch).toHaveBeenCalled()
  })
})
