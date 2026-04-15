import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { DocumentTocTextStyleSection } from '../DocumentTocTextStyleSection'

const SelectContext = React.createContext<{ onValueChange?: (value: string) => void } | null>(null)

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <input type="checkbox" checked={checked} onChange={event => onCheckedChange?.(event.target.checked)} {...props} />
  ),
  Input: (props: Record<string, unknown>) => <input {...props} />,
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <label {...props}>{children}</label>
  ),
  Select: ({ children, onValueChange }: React.PropsWithChildren<{ onValueChange?: (value: string) => void }>) => (
    <SelectContext.Provider value={{ onValueChange }}>{children}</SelectContext.Provider>
  ),
  SelectContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    const divProps = { ...props }
    delete divProps.onOpenAutoFocus
    delete divProps.onCloseAutoFocus
    return <div {...divProps}>{children}</div>
  },
  SelectItem: ({ children, value, ...props }: React.PropsWithChildren<Record<string, unknown> & { value: string }>) => {
    const context = React.useContext(SelectContext)
    return (
      <button type="button" onClick={() => context?.onValueChange?.(value)} {...props}>
        {children}
      </button>
    )
  },
  SelectTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: () => <span />,
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

describe('DocumentTocTextStyleSection', () => {
  it('applies a preset font size from the size options', () => {
    const onChange = jest.fn()

    render(
      <DocumentTocTextStyleSection
        title="Table text"
        value={{
          fontFamily: '',
          fontSizePt: null,
          bold: false,
          italic: false,
          color: null
        }}
        defaultValue={{
          fontFamily: '',
          fontSizePt: null,
          bold: false,
          italic: false,
          color: null
        }}
        onChange={onChange}
        onMouseDown={event => event.preventDefault()}
        selectContentProps={{
          'data-document-toc-sidebar-dropdown': '',
          onOpenAutoFocus: () => undefined,
          onCloseAutoFocus: () => undefined
        }}
        testIdPrefix="document-toc-text-style"
      />
    )

    fireEvent.click(screen.getByText('14'))

    expect(onChange).toHaveBeenCalledWith({
      fontFamily: '',
      fontSizePt: 14,
      bold: false,
      italic: false,
      color: null
    })
  })
})
