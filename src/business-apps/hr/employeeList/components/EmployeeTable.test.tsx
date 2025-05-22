import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeTable } from './EmployeeTable';
import { Employee } from '@/modules/hr/hooks/useGetEmployees';

// Mock formatDataTestId function
jest.mock('@/modules/orgchart/utils', () => ({
  formatDataTestId: (prefix: string, id: string) => `${prefix}-${id}`,
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('EmployeeTable', () => {
  const mockEmployees: Employee[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      jobTitle: 'Developer',
      organizationalUnit: 'IT',
      email: 'john.doe@example.com',
      profilePicture: '',
      employmentType: 'Full-time',
      contractType: 'Permanent',
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      jobTitle: 'Designer',
      organizationalUnit: 'Design',
      email: 'jane.smith@example.com',
      profilePicture: 'data:image/jpeg;base64,abc123',
      employmentType: 'Part-time',
      contractType: 'Contract',
    },
  ];

  const defaultProps = {
    employees: mockEmployees,
    loading: false,
    error: null,
    hasMore: true,
    loadMore: jest.fn(),
    retry: jest.fn(),
    total: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders the table with employee data', () => {
    render(<EmployeeTable {...defaultProps} />);
    
    // Check if employee names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Check if job titles are displayed
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    
    // Check if emails are displayed
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('displays the load more button when hasMore is true', () => {
    render(<EmployeeTable {...defaultProps} hasMore={true} />);
    
    const loadMoreButton = screen.getByText('Load More');
    expect(loadMoreButton).toBeInTheDocument();
    
    fireEvent.click(loadMoreButton);
    expect(defaultProps.loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not display the load more button when hasMore is false', () => {
    render(<EmployeeTable {...defaultProps} hasMore={false} />);
    
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('displays error message and retry button when there is an error', () => {
    render(<EmployeeTable {...defaultProps} error={new Error('Test error')} />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(defaultProps.retry).toHaveBeenCalledTimes(1);
  });

  it('navigates to employee profile when View Profile button is clicked', () => {
    render(<EmployeeTable {...defaultProps} />);
    
    const viewProfileButtons = screen.getAllByText('View Profile');
    expect(viewProfileButtons.length).toBe(2);
    
    fireEvent.click(viewProfileButtons[0]);
    expect(window.location.href).toBe('/platform/landing_screen/srn_employeeProfile?id=1');
  });
});
