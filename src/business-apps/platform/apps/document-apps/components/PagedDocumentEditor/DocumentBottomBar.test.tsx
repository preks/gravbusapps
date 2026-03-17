import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { DocumentBottomBar } from './DocumentBottomBar'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars?.count !== undefined) return `${key}:${vars.count}`
      if (vars?.current !== undefined && vars?.total !== undefined) return `${key}:${vars.current}/${vars.total}`
      return key
    }
  }),
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Slider: ({
    value,
    onValueChange,
    ...props
  }: {
    value: number[]
    onValueChange?: (value: number[]) => void
    [key: string]: unknown
  }) => (
    <input
      type="range"
      value={value[0]}
      onChange={event => onValueChange?.([Number(event.currentTarget.value)])}
      {...props}
    />
  )
}))

describe('DocumentBottomBar', () => {
  it('renders document stats and zoom controls', () => {
    render(
      <DocumentBottomBar
        zoom={100}
        wordCount={48}
        charCount={458}
        currentPage={1}
        pageCount={2}
        onZoomOut={jest.fn()}
        onZoomChange={jest.fn()}
        onZoomIn={jest.fn()}
        data-testid="document-bottom-bar"
      />
    )

    expect(screen.getByTestId('document-bottom-bar')).toBeInTheDocument()
    expect(screen.getByText('editor-word-count:48')).toBeInTheDocument()
    expect(screen.getByText('editor-character-count:458')).toBeInTheDocument()
    expect(screen.getByText('editor-page-of:1/2')).toBeInTheDocument()
    expect(screen.getByTestId('document-bottom-bar-zoom-slider')).toHaveValue('100')
    expect(screen.getByTestId('document-bottom-bar-zoom-value')).toHaveTextContent('100%')
  })

  it('calls the zoom handlers', () => {
    const onZoomOut = jest.fn()
    const onZoomChange = jest.fn()
    const onZoomIn = jest.fn()
    render(
      <DocumentBottomBar
        zoom={90}
        wordCount={10}
        charCount={100}
        currentPage={2}
        pageCount={4}
        onZoomOut={onZoomOut}
        onZoomChange={onZoomChange}
        onZoomIn={onZoomIn}
        data-testid="document-bottom-bar"
      />
    )

    fireEvent.click(screen.getByTestId('document-bottom-bar-zoom-out'))
    fireEvent.change(screen.getByTestId('document-bottom-bar-zoom-slider'), { target: { value: '120' } })
    fireEvent.click(screen.getByTestId('document-bottom-bar-zoom-in'))

    expect(onZoomOut).toHaveBeenCalledTimes(1)
    expect(onZoomChange).toHaveBeenCalledWith(120)
    expect(onZoomIn).toHaveBeenCalledTimes(1)
  })
})
