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
  fontSizePixelsToPoints,
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
    DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick,
      onSelect,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      onSelect?: () => void
    }) => (
      <button
        type="button"
        onClick={event => {
          onClick?.(event)
          onSelect?.()
        }}
        {...props}
      >
        {children}
      </button>
    ),
    DropdownMenuTrigger: ({ children }: { children?: React.ReactNode; asChild?: boolean }) => <>{children}</>,
    TooltipProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children?: React.ReactNode; asChild?: boolean }) => <>{children}</>,
    TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

function renderToolbar(
  formatting?: ResolvedTextFormattingState,
  props: Partial<React.ComponentProps<typeof TextFormattingTools>> = {}
) {
  render(
    <TextFormattingTools
      element={makeTextElement()}
      formatting={formatting}
      onUpdateElement={() => {}}
      onShowLinkDialog={() => {}}
      testId="toolbar"
      {...props}
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
    expect(getFontSizeOptions(13.333333333333332)).toContain(10)
    expect(getCodeLanguageOptions('mermaid')[0]).toEqual({
      value: 'mermaid',
      label: 'mermaid'
    })
    expect(getCodeFontSizeOptions(22)[0]).toBe(22)
  })

  it('normalizes legacy integer px text sizes to clean PowerPoint values', () => {
    expect(fontSizePixelsToPoints(13)).toBe(10)
    expect(fontSizePixelsToPoints(21)).toBe(16)
  })

  it('keeps custom pt-derived values when they are not near a standard preset', () => {
    expect(fontSizePixelsToPoints(21.6)).toBe(16.2)
    expect(fontSizePixelsToPoints(23)).toBe(17.25)
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
    renderToolbar({ fontSize: 13.333333333333332 })

    expect(screen.getByTestId('toolbar-font-size-input')).toHaveValue('10')
  })

  it('shows an imported font size in the property panel when the selection resolves to that size', () => {
    renderPropertyPanel(makeTextElement(), { fontSize: 13.333333333333332 })

    expect(screen.getByLabelText('props-font-size')).toHaveValue('10')
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

    expect(screen.getByTestId('toolbar-font-size-input')).toHaveValue('')
  })

  it('keeps the property panel font-size control empty for mixed selections', () => {
    renderPropertyPanel(makeTextElement(), { isFontSizeMixed: true })

    expect(screen.getByLabelText('props-font-size')).toHaveValue('')
  })

  it('lets users type a custom toolbar font size in pt and converts it for updates', () => {
    const onUpdateElement = jest.fn()

    renderToolbar(undefined, { onUpdateElement })

    const input = screen.getByTestId('toolbar-font-size-input')
    fireEvent.change(input, { target: { value: '17' } })
    fireEvent.blur(input)

    expect(onUpdateElement).toHaveBeenCalledWith('text-1', expect.objectContaining({ fontSize: 22.6667 }))
  })

  it('lets users type a custom property-panel font size in pt and converts it for updates', () => {
    const onUpdate = jest.fn()

    renderPropertyPanel(makeTextElement(), undefined, { onUpdate })

    const input = screen.getByLabelText('props-font-size')
    fireEvent.change(input, { target: { value: '21' } })
    fireEvent.blur(input)

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 28 }))
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

  it('sends bullet and numbering commands from the toolbar list controls', () => {
    const onUpdateElement = jest.fn()

    renderToolbar(undefined, {
      onUpdateElement
    })

    fireEvent.click(screen.getByTestId('toolbar-list-bullet-25c6'))
    expect(onUpdateElement).toHaveBeenCalledWith('text-1', { bulletType: 'bullet', bulletChar: '◆' })

    fireEvent.click(screen.getByTestId('toolbar-list-numbering-romanUcPeriod'))
    expect(onUpdateElement).toHaveBeenCalledWith('text-1', { bulletType: 'number', numberingStyle: 'romanUcPeriod' })
  })

  it('sends indent and outdent commands from the toolbar list controls', () => {
    const onUpdateElement = jest.fn()

    renderToolbar(
      {
        bulletType: 'bullet',
        indentLevel: 1
      },
      { onUpdateElement }
    )

    fireEvent.click(screen.getByTestId('toolbar-list-indent'))
    expect(onUpdateElement).toHaveBeenCalledWith('text-1', { indentLevel: 2 })

    fireEvent.click(screen.getByTestId('toolbar-list-outdent'))
    expect(onUpdateElement).toHaveBeenCalledWith('text-1', { indentLevel: 0 })
  })
})
