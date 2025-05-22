import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EmployeeList } from './EmployeeList';
import { useGetEmployees } from '@/modules/hr/hooks/useGetEmployees';

// Mock the hooks
jest.mock('@/modules/hr/hooks/useGetEmployees');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));
jest.mock('@/components/layout/pageLayout', () => ({
  PageLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  DataContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="data-container">{children}</div>
  ),
}));
jest.mock('./components/EmployeeTable', () => ({
  EmployeeTable: ({ employees }: { employees: any[] }) => (
    <div data-testid="employee-table">
      {employees.length} employees
    </div>
  ),
}));

describe('EmployeeList', () => {
  const mockEmployees = [
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
      profilePicture: '',
      employmentType: 'Part-time',
      contractType: 'Contract',
    },
  ];

  beforeEach(() => {
    (useGetEmployees as jest.Mock).mockReturnValue({
      employees: mockEmployees,
      total: 2,
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      retry: jest.fn(),
    });
  });

  it('renders the employee list page with correct title', () => {
    render(<EmployeeList />);
    expect(screen.getByText('Employee List')).toBeInTheDocument();
  });

  it('renders the employee table with data', async () => {
    render(<EmployeeList />);
    await waitFor(() => {
      expect(screen.getByTestId('employee-table')).toBeInTheDocument();
      expect(screen.getByText('2 employees')).toBeInTheDocument();
    });
  });

  it('renders loading state correctly', async () => {
    (useGetEmployees as jest.Mock).mockReturnValue({
      employees: [],
      total: 0,
      loading: true,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      retry: jest.fn(),
    });
    
    render(<EmployeeList />);
    await waitFor(() => {
      expect(screen.getByTestId('employee-table')).toBeInTheDocument();
      expect(screen.getByText('0 employees')).toBeInTheDocument();
    });
  });

  it('renders error state correctly', async () => {
    (useGetEmployees as jest.Mock).mockReturnValue({
      employees: [],
      total: 0,
      loading: false,
      error: new Error('Test error'),
      hasMore: false,
      loadMore: jest.fn(),
      retry: jest.fn(),
    });
    
    render(<EmployeeList />);
    await waitFor(() => {
      expect(screen.getByTestId('employee-table')).toBeInTheDocument();
    });
  });
});
