import React from 'react'
import { render, screen } from '@testing-library/react'
import { FunctionManager } from './FunctionManager'

const useFunctionsDataMock = jest.fn()
const createFunctionsColumnsMock = jest.fn()

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DataDisplay: ({ children, primaryAction }: any) => (
    <div data-testid="mock-data-display">
      {primaryAction && typeof primaryAction === 'object' && 'label' in primaryAction ? (
        <button type="button" data-testid="mock-data-display-primary-action" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      ) : null}
      {children}
    </div>
  ),
  DataTable: () => <div data-testid="mock-data-table" />,
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'page-title': 'Functions',
          'page-description': 'Manage versioned functions for agents and flows',
          'new-function': 'New Function',
          'section-label': 'Functions',
          'search-placeholder': 'Search functions',
          edit: 'Edit',
          'empty-message': 'No functions found',
          'tab-functions': 'Functions',
          'tab-credentials': 'Credentials'
        }) as Record<string, string>
      )[key] ?? key
  })
}))

jest.mock('./hooks/useFunctionsData', () => ({
  useFunctionsData: (...args: unknown[]) => useFunctionsDataMock(...args)
}))

jest.mock('./config/functionsColumns', () => ({
  createFunctionsColumns: (...args: unknown[]) => createFunctionsColumnsMock(...args)
}))

jest.mock('@/common/network/graphql/descriptorUtils', () => ({
  deriveAvailableColumns: () => []
}))

jest.mock('./components/FunctionEditor', () => ({
  FunctionEditor: () => <div data-testid="mock-function-editor" />
}))

describe('FunctionManager', () => {
  beforeEach(() => {
    useFunctionsDataMock.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      search: '',
      setSearch: jest.fn(),
      pagination: { pageIndex: 0, pageSize: 20 },
      setPagination: jest.fn(),
      visibleColumns: [],
      setVisibleColumns: jest.fn(),
      refetch: jest.fn()
    })

    createFunctionsColumnsMock.mockReturnValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the overview with the hero and data display', () => {
    render(<FunctionManager accessToken="token" />)

    expect(screen.getByTestId('FunctionManager')).toBeInTheDocument()
    expect(screen.getByText('Functions')).toBeInTheDocument()
    expect(screen.getByTestId('mock-data-display-primary-action')).toHaveTextContent('New Function')
    expect(screen.getByTestId('mock-data-display')).toBeInTheDocument()
    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument()
  })
})
