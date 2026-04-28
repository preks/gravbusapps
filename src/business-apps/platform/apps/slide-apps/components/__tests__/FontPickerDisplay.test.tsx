import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { PropertyPanel } from '../PropertyPanel'
import { TextFormattingTools } from '../toolbar/TextFormattingTools'
import {
  createShapeFromPreset,
  type AnySlideElement,
  type CodeElement,
  type ShapeElement,
  type TextElement
} from '../slideElements'
import {
  getCodeFontSizeOptions,
  getCodeLanguageOptions,
  getFontFamilyOptions,
  getFontSizeOptions
} from '../slideElements'
import type { ResolvedTextFormattingState } from '../../utils/richTextEditing'
import { createDefaultShapeText } from '../../utils/richTextEditing'

jest.mock('../../services', () => ({
  SlidesApiService: {
    uploadFile: jest.fn().mockResolvedValue('')
  }
}))

jest.mock('@newwork/nw-design-system', () => {
  const actualReact = jest.requireActual('react') as typeof import('react')

  type SelectContextValue = {
    label?: string
  }

  const SelectContext = actualReact.createContext<SelectContextValue>({})

  function readTextContent(children: React.ReactNode): string {
    let text = ''

    actualReact.Children.forEach(children, child => {
      if (typeof child === 'string' || typeof child === 'number') {
        text += String(child)
        return
      }

      if (!actualReact.isValidElement<{ children?: React.ReactNode }>(child)) return
      text += readTextContent(child.props.children)
    })

    return text
  }

  function collectSelectItems(children: React.ReactNode): Array<{ value: string; label: string }> {
    const items: Array<{ value: string; label: string }> = []

    actualReact.Children.forEach(children, child => {
      if (!actualReact.isValidElement<{ children?: React.ReactNode; value?: string }>(child)) return

      if (child.type === SelectItem) {
        items.push({
          value: child.props.value ?? '',
          label: readTextContent(child.props.children)
        })
      }

      items.push(...collectSelectItems(child.props.children))
    })

    return items
  }

  function Select({
    value,
    children
  }: {
    value?: string
    children?: React.ReactNode
    onValueChange?: (value: string) => void
  }) {
    if (value === undefined) {
      throw new Error('Select received undefined value')
    }

    const items = collectSelectItems(children)
    const label = items.find(item => item.value === value)?.label

    return <SelectContext.Provider value={{ label }}>{children}</SelectContext.Provider>
  }

  function SelectItem() {
    return null
  }

  return {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
      <label {...props}>{children}</label>
    ),
    Select,
    SelectContent: () => null,
    SelectItem,
    SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const { label } = actualReact.useContext(SelectContext)
      return <span>{label ?? placeholder ?? ''}</span>
    },
    Slider: () => <div />,
    Separator: () => <hr />,
    Switch: ({
      checked,
      onCheckedChange,
      ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & {
      onCheckedChange?: (checked: boolean) => void
    }) => (
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onCheckedChange?.(event.target.checked)}
        readOnly={!onCheckedChange}
        {...props}
      />
    ),
    Collapsible: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    CollapsibleContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    CollapsibleTrigger: ({ children }: { children?: React.ReactNode; asChild?: boolean }) => <>{children}</>,
    Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children?: React.ReactNode; asChild?: boolean }) => <>{children}</>,
    useTranslation: () => ({
      t: (key: string) => (key === 'editor-mixed' ? 'Mixed' : key)
    })
  }
})

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 300, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 0,
    ...overrides
  }
}

function makeCodeElement(overrides: Partial<CodeElement> = {}): CodeElement {
  return {
    id: 'code-1',
    type: 'code',
    position: { x: 0, y: 0 },
    size: { width: 300, height: 180 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    code: 'console.log("hello")',
    language: 'typescript',
    theme: 'dark',
    showLineNumbers: true,
    fontSize: 14,
    textColor: '#ffffff',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    shadow: false,
    padding: 16,
    ...overrides
  }
}

function makeShapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return createShapeFromPreset('rect', {
    id: 'shape-1',
    position: { x: 0, y: 0 },
    size: { width: 240, height: 140 },
    shapeText: createDefaultShapeText({
      content: 'Shape label',
      padding: 16
    }),
    ...overrides
  })
}

function renderToolbar(formatting?: ResolvedTextFormattingState) {
  render(
    <TextFormattingTools
      element={makeTextElement()}
      formatting={formatting}
      onUpdateElement={() => {}}
      onShowLinkDialog={() => {}}
    />
  )
}

function renderPropertyPanel(
  element: AnySlideElement = makeTextElement(),
  formatting?: ResolvedTextFormattingState,
  panelProps: Partial<React.ComponentProps<typeof PropertyPanel>> = {}
) {
  render(
    <PropertyPanel
      element={element}
      textFormatting={formatting}
      onUpdate={() => {}}
      onDelete={() => {}}
      onDuplicate={() => {}}
      onBringForward={() => {}}
      onSendBackward={() => {}}
      {...panelProps}
    />
  )
}

describe('font picker display', () => {
  it('adds imported fonts to the available font options', () => {
    expect(getFontFamilyOptions('Funnel Display')[0]).toEqual({
      value: 'Funnel Display',
      label: 'Funnel Display'
    })
  })

  it('adds imported text and code select values to the available options', () => {
    expect(getFontSizeOptions(29)[0]).toBe(29)
    expect(getCodeLanguageOptions('mermaid')[0]).toEqual({
      value: 'mermaid',
      label: 'mermaid'
    })
    expect(getCodeFontSizeOptions(22)[0]).toBe(22)
  })

  it('shows an imported font in the toolbar when the selection resolves to that font', () => {
    renderToolbar({ fontFamily: 'Funnel Display' })

    expect(screen.getByText('Funnel Display')).toBeInTheDocument()
  })

  it('shows an imported font in the property panel when the selection resolves to that font', () => {
    renderPropertyPanel(makeTextElement(), { fontFamily: 'Funnel Display' })

    expect(screen.getByText('Funnel Display')).toBeInTheDocument()
  })

  it('shows an imported font size in the toolbar when the selection resolves to that size', () => {
    renderToolbar({ fontSize: 29 })

    expect(screen.getByText('29')).toBeInTheDocument()
  })

  it('shows an imported font size in the property panel when the selection resolves to that size', () => {
    renderPropertyPanel(makeTextElement(), { fontSize: 29 })

    const fontSizeSection = screen.getByText('props-font-size').parentElement
    expect(fontSizeSection).not.toBeNull()
    expect(within(fontSizeSection as HTMLElement).getByText('29px')).toBeInTheDocument()
  })

  it('shows imported code language and size values in the property panel', () => {
    renderPropertyPanel(makeCodeElement({ language: 'mermaid', fontSize: 22 }))

    const languageSection = screen.getByText('props-code-language').parentElement
    const codeFontSizeSection = screen.getByText('props-code-font-size').parentElement

    expect(languageSection).not.toBeNull()
    expect(codeFontSizeSection).not.toBeNull()
    expect(within(languageSection as HTMLElement).getByText('mermaid')).toBeInTheDocument()
    expect(within(codeFontSizeSection as HTMLElement).getByText('22px')).toBeInTheDocument()
  })

  it('keeps the toolbar font-family control empty for mixed selections', () => {
    renderToolbar({ isFontFamilyMixed: true })

    expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
    expect(screen.queryByText('Inter')).not.toBeInTheDocument()
  })

  it('keeps the property panel font-family control empty for mixed selections', () => {
    renderPropertyPanel(makeTextElement(), { isFontFamilyMixed: true })

    expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
    expect(screen.queryByText('Inter')).not.toBeInTheDocument()
  })

  it('keeps the toolbar font-size control empty for mixed selections', () => {
    renderToolbar({ isFontSizeMixed: true })

    expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
    expect(screen.queryByText('16')).not.toBeInTheDocument()
  })

  it('keeps the property panel font-size control empty for mixed selections', () => {
    renderPropertyPanel(makeTextElement(), { isFontSizeMixed: true })

    const fontSizeSection = screen.getByText('props-font-size').parentElement
    expect(fontSizeSection).not.toBeNull()
    expect(within(fontSizeSection as HTMLElement).queryByText('Mixed')).not.toBeInTheDocument()
    expect(within(fontSizeSection as HTMLElement).queryByText('16px')).not.toBeInTheDocument()
  })

  it('disables destructive and transform actions for locked-only text selections', () => {
    renderPropertyPanel(makeTextElement({ locked: true }), undefined, {
      hasLockedSelection: true,
      hasUnlockedSelection: false
    })

    expect(screen.getByTitle('props-duplicate')).toBeDisabled()
    expect(screen.getByTitle('props-delete')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'props-forward' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'props-back' })).toBeDisabled()

    screen.getAllByRole('spinbutton').forEach(input => {
      expect(input).toBeDisabled()
    })
  })

  it('disables shape point editing for locked-only shape selections', () => {
    renderPropertyPanel(makeShapeElement({ locked: true }), undefined, {
      hasLockedSelection: true,
      hasUnlockedSelection: false,
      onEditPoints: () => {}
    })

    expect(screen.getByTestId('property-panel-edit-points')).toBeDisabled()
    screen.getAllByRole('button', { name: 'props-flip-horizontal' }).forEach(button => {
      expect(button).toBeDisabled()
    })
    screen.getAllByRole('button', { name: 'props-flip-vertical' }).forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('lets shape selections clear the fill without affecting the stroke controls', () => {
    const onUpdate = jest.fn()

    renderPropertyPanel(
      makeShapeElement({
        fill: '#3b82f6',
        gradient: {
          type: 'linear',
          angle: 90,
          stops: [
            { color: '#EA5929', position: 0 },
            { color: '#54275F', position: 100 }
          ]
        }
      }),
      undefined,
      { onUpdate }
    )

    fireEvent.click(screen.getByRole('button', { name: 'props-no-fill' }))

    expect(onUpdate).toHaveBeenCalledWith({ fill: 'transparent', gradient: undefined })
    expect(screen.getByText('props-stroke-color')).toBeInTheDocument()
  })
})
