import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsEditor } from './SettingsEditor'

describe('SettingsEditor', () => {
  it('forwards shared connection selection changes', () => {
    const onConnectionChange = jest.fn()

    render(
      <SettingsEditor
        rows={[{ key: 'API_KEY', value: 'secret' }]}
        onChange={jest.fn()}
        connectionOptions={[
          { id: 'conn-default', name: 'Default connection' },
          { id: 'conn-custom', name: 'Custom connection' }
        ]}
        selectedConnectionId={null}
        onConnectionChange={onConnectionChange}
      />
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'conn-custom' } })

    expect(onConnectionChange).toHaveBeenCalledWith('conn-custom')
  })
})
