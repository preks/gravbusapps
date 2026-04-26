import React from 'react'
import { render, screen } from '@testing-library/react'
import { PropertyPanel } from '../PropertyPanel'
import { TextFormattingTools } from '../toolbar/TextFormattingTools'
import type { TextElement } from '../slideElements'
import { getFontFamilyOptions } from '../slideElements'
import type { ResolvedTextFormattingState } from '../../utils/richTextEditing'

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
    Switch: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input type="checkbox" {...props} />,
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

function renderPropertyPanel(formatting?: ResolvedTextFormattingState) {
  render(
    <PropertyPanel
      element={makeTextElement()}
      textFormatting={formatting}
      onUpdate={() => {}}
      onDelete={() => {}}
      onDuplicate={() => {}}
      onBringForward={() => {}}
      onSendBackward={() => {}}
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

  it('shows an imported font in the toolbar when the selection resolves to that font', () => {
    renderToolbar({ fontFamily: 'Funnel Display' })

    expect(screen.getByText('Funnel Display')).toBeInTheDocument()
  })

  it('shows an imported font in the property panel when the selection resolves to that font', () => {
    renderPropertyPanel({ fontFamily: 'Funnel Display' })

    expect(screen.getByText('Funnel Display')).toBeInTheDocument()
  })

  it('keeps the toolbar font-family control empty for mixed selections', () => {
    renderToolbar({ isFontFamilyMixed: true })

    expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
    expect(screen.queryByText('Inter')).not.toBeInTheDocument()
  })

  it('keeps the property panel font-family control empty for mixed selections', () => {
    renderPropertyPanel({ isFontFamilyMixed: true })

    expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
    expect(screen.queryByText('Inter')).not.toBeInTheDocument()
  })
})
