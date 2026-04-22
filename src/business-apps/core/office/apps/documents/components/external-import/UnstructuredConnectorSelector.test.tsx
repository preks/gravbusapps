import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { UnstructuredConnectorSelector } from './UnstructuredConnectorSelector'

describe('UnstructuredConnectorSelector', () => {
  it('shows shared connection errors and allows selection', () => {
    const onConnectionChange = jest.fn()

    render(
      <UnstructuredConnectorSelector
        connectors={[{ id: 'confluence', name: 'Confluence', description: 'Wiki connector' } as any]}
        selectedId="confluence"
        onSelect={jest.fn()}
        connectionOptions={[{ id: 'conn-1', name: 'Primary Confluence connection' }]}
        selectedConnectionId={null}
        onConnectionChange={onConnectionChange}
        connectionError="Failed to load shared connections"
        onNext={jest.fn()}
        isLoading={false}
      />
    )

    expect(screen.getByTestId('unstructured-connector-selector-shared-connection-error')).toHaveTextContent(
      'Failed to load shared connections'
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'conn-1' } })

    expect(onConnectionChange).toHaveBeenCalledWith('conn-1')
  })
})
