import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { FlowLaunchFileField } from './FlowLaunchFileField'

describe('FlowLaunchFileField', () => {
  it('shows the selected file and allows removing it', () => {
    const Harness = () => {
      const [value, setValue] = React.useState<File | undefined>(undefined)
      return <FlowLaunchFileField value={value} onChange={setValue} data-testid="launcher-file-field" />
    }

    render(<Harness />)

    const input = screen.getByTestId('launcher-file-field-input')
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByTestId('launcher-file-field-selected')).toHaveTextContent('hello.txt')

    fireEvent.click(screen.getByTestId('launcher-file-field-remove-button'))

    expect(screen.queryByTestId('launcher-file-field-selected')).not.toBeInTheDocument()
  })
})
