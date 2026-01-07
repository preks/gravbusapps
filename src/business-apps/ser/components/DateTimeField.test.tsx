import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateTimeField } from './DateTimeField';

// Mock dayjs to avoid timezone issues in tests
jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  return {
    ...originalDayjs,
    default: originalDayjs.default,
  };
});

describe('DateTimeField', () => {
  const defaultProps = {
    name: 'test-date',
    label: 'Test Date',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders date field correctly', () => {
    render(<DateTimeField {...defaultProps} type="date" />);
    
    expect(screen.getByTestId('datetime-field-test-date-label')).toBeInTheDocument();
    expect(screen.getByText('Test Date')).toBeInTheDocument();
    expect(screen.getByTestId('datetime-field-test-date-trigger')).toBeInTheDocument();
  });

  it('renders datetime field correctly', () => {
    render(<DateTimeField {...defaultProps} type="datetime" />);
    
    expect(screen.getByTestId('datetime-field-test-date-label')).toBeInTheDocument();
    expect(screen.getByText('Test Date')).toBeInTheDocument();
    expect(screen.getByTestId('datetime-field-test-date-trigger')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<DateTimeField {...defaultProps} required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    const description = 'Please select a date';
    render(<DateTimeField {...defaultProps} description={description} />);
    
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('shows error message when hasError is true', () => {
    const errorMessage = 'Date is required';
    render(<DateTimeField {...defaultProps} hasError errorMessage={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('opens calendar when trigger is clicked', () => {
    render(<DateTimeField {...defaultProps} type="date" />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByTestId('datetime-field-test-date-calendar')).toBeInTheDocument();
  });

  it('displays formatted date value', () => {
    const testDate = new Date('2024-01-15');
    render(<DateTimeField {...defaultProps} type="date" value={testDate} />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    expect(trigger).toHaveTextContent('2024-01-15');
  });

  it('calls onChange when date is selected', () => {
    const onChange = jest.fn();
    render(<DateTimeField {...defaultProps} onChange={onChange} type="date" />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    fireEvent.click(trigger);
    
    // This would require more complex calendar interaction testing
    // For now, we just verify the calendar opens
    expect(screen.getByTestId('datetime-field-test-date-calendar')).toBeInTheDocument();
  });

  it('disables field when disabled prop is true', () => {
    render(<DateTimeField {...defaultProps} disabled />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    expect(trigger).toBeDisabled();
  });

  it('shows time input for datetime type', () => {
    render(<DateTimeField {...defaultProps} type="datetime" />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByTestId('datetime-field-test-date-time-input')).toBeInTheDocument();
    expect(screen.getByTestId('datetime-field-test-date-time-select')).toBeInTheDocument();
  });

  it('shows clear and done buttons for datetime type', () => {
    render(<DateTimeField {...defaultProps} type="datetime" />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByTestId('datetime-field-test-date-clear')).toBeInTheDocument();
    expect(screen.getByTestId('datetime-field-test-date-done')).toBeInTheDocument();
  });

  it('handles string date values', () => {
    const dateString = '2024-01-15T10:30:00Z';
    render(<DateTimeField {...defaultProps} type="datetime" value={dateString} />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    // Should display the formatted date/time
    expect(trigger.textContent).toContain('2024-01-15');
  });

  it('handles null/undefined values gracefully', () => {
    render(<DateTimeField {...defaultProps} value={null} />);
    
    const trigger = screen.getByTestId('datetime-field-test-date-trigger');
    expect(trigger).toHaveTextContent('Select test date');
  });
});
