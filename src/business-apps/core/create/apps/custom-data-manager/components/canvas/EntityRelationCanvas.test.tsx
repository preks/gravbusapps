import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { EntityRelationCanvas } from './EntityRelationCanvas'

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

jest.mock('@/common/components/flow/data-viewer', () => ({
  DataCanvas: ({ toolbar }: any) => <div>{toolbar}</div>
}))

jest.mock('../../hooks/useEntityGraph', () => ({
  useEntityGraph: jest.fn(() => ({
    nodes: [],
    edges: []
  }))
}))

describe('EntityRelationCanvas', () => {
  it('renders a namespace promotion action in the canvas toolbar', () => {
    const handlePromoteNamespace = jest.fn()

    render(
      <EntityRelationCanvas
        definitions={[
          {
            id: 'def-1',
            namespace: 'sales',
            key: 'asset',
            kind: 'CUSTOM_ENTITY',
            display_name: 'Asset',
            columns_json: [],
            publish_state: 'DRAFT',
            created_at: '',
            updated_at: ''
          }
        ]}
        namespaceAggregate={null}
        onSelectEntity={jest.fn()}
        onAddEntity={jest.fn()}
        onPromoteNamespace={handlePromoteNamespace}
      />
    )

    fireEvent.click(screen.getByTestId('entity-relation-canvas-promote-namespace'))

    expect(handlePromoteNamespace).toHaveBeenCalledTimes(1)
  })
})
