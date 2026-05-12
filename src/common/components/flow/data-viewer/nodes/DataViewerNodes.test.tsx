import React from 'react'
import { render, screen } from '@testing-library/react'
import { EntityNode } from './EntityNode'
import { InternalEntityNode } from './InternalEntityNode'

jest.mock('@newwork/nw-design-system', () => {
  return {
    Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>
  }
})

jest.mock('@xyflow/react', () => {
  return {
    Handle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Position: {
      Top: 'top',
      Left: 'left',
      Bottom: 'bottom',
      Right: 'right'
    }
  }
})

describe('data viewer nodes', () => {
  it('renders entity properties with human-readable labels', () => {
    render(
      <EntityNode
        {...({
          data: {
            entityName: 'SalesOrder',
            displayName: 'Sales Order',
            publishState: 'DRAFT',
            columns: [
              {
                name: 'accountId',
                label: 'Account Owner',
                type: 'SELECT',
                dataSource: { type: 'CUSTOM_ENTITY', entity: 'AccountProfile' }
              },
              {
                name: 'createdAt',
                type: 'TIMESTAMP'
              }
            ],
            isExternal: false
          },
          selected: false
        } as any)}
      />
    )

    expect(screen.getByText('Sales Order')).toBeInTheDocument()
    expect(screen.getByText('Account Owner')).toBeInTheDocument()
    expect(screen.getByText('Account Profile')).toBeInTheDocument()
    expect(screen.getByText('Created At')).toBeInTheDocument()
    expect(screen.getByText('Timestamp')).toBeInTheDocument()
  })

  it('renders internal entity fields with human-readable labels', () => {
    render(
      <InternalEntityNode
        {...({
          data: {
            entityType: 'account',
            displayName: 'Account',
            fields: [
              { name: 'displayName', displayName: 'Display Name', type: 'String' },
              { name: 'account_id', displayName: 'Account ID', type: 'UUID' }
            ]
          },
          selected: false
        } as any)}
      />
    )

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Display Name')).toBeInTheDocument()
    expect(screen.getByText('Account ID')).toBeInTheDocument()
    expect(screen.getByText('String')).toBeInTheDocument()
    expect(screen.getByText('UUID')).toBeInTheDocument()
  })
})
