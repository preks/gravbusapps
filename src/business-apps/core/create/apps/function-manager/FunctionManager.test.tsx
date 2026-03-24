import React from 'react'
import { render, screen } from '@testing-library/react'
import { FunctionManager } from './FunctionManager'

const createLayoutMock = jest.fn()
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
          'empty-message': 'No functions found'
        }) as Record<string, string>
      )[key] ?? key
  })
}))

jest.mock('@/components/create-layout', () => ({
  CreateLayout: (props: any) => createLayoutMock(props)
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
    createLayoutMock.mockImplementation(({ heroVariant, heroExtra, canvasPanel, testId }: any) => (
      <div data-testid="mock-create-layout" data-hero-variant={heroVariant} data-layout-testid={testId}>
        <div data-testid="mock-create-layout-extra">{heroExtra}</div>
        <div data-testid="mock-create-layout-canvas">{canvasPanel}</div>
      </div>
    ))

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

  it('renders the overview inside CreateLayout overview mode', () => {
    render(<FunctionManager accessToken="token" />)

    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-hero-variant', 'overview')
    expect(screen.getByTestId('mock-create-layout')).toHaveAttribute('data-layout-testid', 'FunctionManager')
    expect(screen.queryByTestId('FunctionManager-hero-create')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-data-display-primary-action')).toHaveTextContent('New Function')
    expect(screen.getByTestId('mock-data-display')).toBeInTheDocument()
    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument()
  })
})
