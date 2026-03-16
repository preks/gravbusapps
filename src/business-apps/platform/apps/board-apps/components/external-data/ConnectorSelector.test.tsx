import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConnectorSelector } from './ConnectorSelector'

describe('ConnectorSelector', () => {
  it('shows shared connection errors and allows selection', () => {
    const onConnectionChange = jest.fn()

    render(
      <ConnectorSelector
        connectors={[{ id: 'sap', name: 'SAP', description: 'ERP connector' } as any]}
        selectedId="sap"
        onSelect={jest.fn()}
        connectionOptions={[{ id: 'conn-1', name: 'Primary SAP connection' }]}
        selectedConnectionId={null}
        onConnectionChange={onConnectionChange}
        connectionError="Failed to load shared connections"
        onNext={jest.fn()}
        isLoading={false}
      />
    )

    expect(screen.getByTestId('connector-selector-shared-connection-error')).toHaveTextContent(
      'Failed to load shared connections'
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'conn-1' } })

    expect(onConnectionChange).toHaveBeenCalledWith('conn-1')
  })
})
