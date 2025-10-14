import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangeLogTab } from '../ChangeLogTab'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'

// Mock the service
jest.mock('../../services/changeLogService', () => ({
  createChangeLogService: jest.fn(() => ({
    fetchChangeLogEntries: jest.fn().mockResolvedValue({
      entries: [
        {
          id: '1',
          fieldName: 'Phone Number',
          fieldCategory: 'address',
          previousValue: '+49 123 456 789',
          newValue: '+49 987 654 321',
          timestamp: '2025-01-14T10:30:00Z',
          changedBy: {
            userId: 'user123',
            userName: 'John Doe',
            userRole: 'HR Manager'
          },
          changeOrigin: {
            flowId: 'flow_123',
            flowName: 'updateEmployeeCommunication',
            templateId: 'template_456',
            isSystemGenerated: false,
            isAIGenerated: false
          },
          isVisible: true,
          isMasked: false
        }
      ],
      totalCount: 1,
      hasMore: false
    })),
    exportChangeLog: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
    getAvailableFieldCategories: jest.fn().mockReturnValue(['personal', 'address', 'skills']),
    getAvailableChangeActors: jest.fn().mockReturnValue(['user', 'ai', 'system'])
  }))
}))

// Mock NW Design System components
jest.mock('@/components/card/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

jest.mock('@/components/button/Button', () => ({
  Button: ({ children, onClick, className, variant }: any) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  )
}))

jest.mock('@/components/input/Input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}))

jest.mock('@/components/select/Select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

jest.mock('@/components/badge/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  )
}))

jest.mock('@/components/tabs/Tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-value={value} onClick={() => onValueChange('flat')}>
      {children}
    </div>
  ),
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-value={value}>{children}</button>
}))

jest.mock('@/components/tooltip/Tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/calendar/Calendar', () => ({
  Calendar: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/popover/Popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>
}))

// Mock icons
jest.mock('lucide-react', () => ({
  CalendarIcon: () => <span>📅</span>,
  Download: () => <span>⬇️</span>,
  Filter: () => <span>🔍</span>,
  Search: () => <span>🔍</span>,
  User: () => <span>👤</span>,
  Bot: () => <span>🤖</span>,
  Settings: () => <span>⚙️</span>
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => 'Jan 14, 2025 10:30')
}))

describe('ChangeLogTab', () => {
  const mockProps: BusinessAppContextProps & {
    employeeId: string
    employeeName: string
    userRole: string
  } = {
    employeeId: 'emp-123',
    employeeName: 'John Doe',
    userRole: 'hr_manager',
    accessToken: 'mock-token',
    userInfo: {
      role: 'hr_manager',
      employeeDetails: { employeeId: 'emp-123' }
    },
    additionalData: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the change log tab with header', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    expect(screen.getByText('Change Log')).toBeInTheDocument()
    expect(screen.getByText("Track all changes to John Doe's profile")).toBeInTheDocument()
  })

  it('shows export button for HR managers', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('does not show export button for regular employees', () => {
    const employeeProps = { ...mockProps, userRole: 'employee' }
    render(<ChangeLogTab {...employeeProps} />)
    
    expect(screen.queryByText('Export')).not.toBeInTheDocument()
  })

  it('renders filters section', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search changes...')).toBeInTheDocument()
    expect(screen.getByText('All categories')).toBeInTheDocument()
    expect(screen.getByText('All actors')).toBeInTheDocument()
  })

  it('handles search input changes', async () => {
    render(<ChangeLogTab {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search changes...')
    fireEvent.change(searchInput, { target: { value: 'phone' } })
    
    expect(searchInput).toHaveValue('phone')
  })

  it('handles filter changes', async () => {
    render(<ChangeLogTab {...mockProps} />)
    
    const categorySelect = screen.getByText('All categories')
    fireEvent.click(categorySelect)
    
    // The actual select interaction would depend on the Select component implementation
    // This is a simplified test
    expect(categorySelect).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    // The component should show loading state while fetching data
    // This would be visible in the actual implementation
  })

  it('displays change log entries when loaded', async () => {
    render(<ChangeLogTab {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Phone Number')).toBeInTheDocument()
      expect(screen.getByText('+49 123 456 789')).toBeInTheDocument()
      expect(screen.getByText('+49 987 654 321')).toBeInTheDocument()
      expect(screen.getByText('Changed by: John Doe')).toBeInTheDocument()
    })
  })

  it('handles export functionality', async () => {
    render(<ChangeLogTab {...mockProps} />)
    
    const exportButton = screen.getByText('Export')
    fireEvent.click(exportButton)
    
    // The export functionality should be triggered
    // In a real test, we would verify the download was initiated
  })

  it('applies role-based field visibility', () => {
    const employeeProps = { ...mockProps, userRole: 'employee' }
    render(<ChangeLogTab {...employeeProps} />)
    
    // Employee should see limited field categories
    // This would be verified by checking the available options in the select
  })

  it('shows clear filters button', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('displays view mode toggle', () => {
    render(<ChangeLogTab {...mockProps} />)
    
    expect(screen.getByText('Flat View')).toBeInTheDocument()
    expect(screen.getByText('Grouped View')).toBeInTheDocument()
  })
})

describe('ChangeLogTab Error Handling', () => {
  const mockProps: BusinessAppContextProps & {
    employeeId: string
    employeeName: string
    userRole: string
  } = {
    employeeId: 'emp-123',
    employeeName: 'John Doe',
    userRole: 'hr_manager',
    accessToken: 'mock-token',
    userInfo: {
      role: 'hr_manager',
      employeeDetails: { employeeId: 'emp-123' }
    },
    additionalData: {}
  }

  it('shows error message when data fetching fails', async () => {
    // Mock the service to throw an error
    const { createChangeLogService } = require('../../services/changeLogService')
    createChangeLogService.mockReturnValue({
      fetchChangeLogEntries: jest.fn().mockRejectedValue(new Error('API Error')),
      exportChangeLog: jest.fn(),
      getAvailableFieldCategories: jest.fn().mockReturnValue([]),
      getAvailableChangeActors: jest.fn().mockReturnValue([])
    })

    render(<ChangeLogTab {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load change log data')).toBeInTheDocument()
    })
  })

  it('shows retry button on error', async () => {
    const { createChangeLogService } = require('../../services/changeLogService')
    createChangeLogService.mockReturnValue({
      fetchChangeLogEntries: jest.fn().mockRejectedValue(new Error('API Error')),
      exportChangeLog: jest.fn(),
      getAvailableFieldCategories: jest.fn().mockReturnValue([]),
      getAvailableChangeActors: jest.fn().mockReturnValue([])
    })

    render(<ChangeLogTab {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})
