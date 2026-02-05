/**
 * Component Tests for SalaryCalculatorInputs
 *
 * Tests cover:
 * - Input field rendering and accessibility
 * - Negative value input (NEW FEATURE - should allow)
 * - Positive value input (existing behavior)
 * - Validation rules
 * - Disabled state when other field has value
 * - User interactions (typing, pasting, etc.)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { LocalizationProvider } from '@newwork/nw-design-system'
import SalaryCalculatorInputs from '../components/SalaryCalculatorInputs'
import type { AdjustEmployeeSalaryFormValues } from '../types'

// Wrapper component to provide form context
const TestWrapper: React.FC<{
  adjustmentFrequency?: 'annually' | 'monthly' | 'hourly'
  defaultValues?: Partial<AdjustEmployeeSalaryFormValues>
}> = ({ adjustmentFrequency = 'annually', defaultValues = {} }) => {
  const form = useForm<AdjustEmployeeSalaryFormValues>({
    defaultValues: {
      amountIncrease: null,
      percentageIncrease: null,
      adjustmentFrequency: 'annually',
      reason: '',
      salaryType: 'yearlyMonthly',
      monthlySalary: null,
      hourlySalary: null,
      currency: '',
      effectiveDate: '',
      notes: '',
      ...defaultValues
    },
    mode: 'onChange' // Changed to onChange so disabled state updates immediately
  })

  return (
    <LocalizationProvider locale="en-US">
      <form>
        <SalaryCalculatorInputs
          control={form.control}
          adjustmentFrequency={adjustmentFrequency}
          currentSalaryAnnual={48000}
          currentSalaryMonthly={4000}
          currentSalaryHourly={30}
        />
      </form>
    </LocalizationProvider>
  )
}

describe('SalaryCalculatorInputs Component', () => {
  describe('Rendering and Accessibility', () => {
    it('should render amount increase input', () => {
      render(<TestWrapper />)

      expect(screen.getByTestId('adjust-employee-salary-amount-label')).toBeInTheDocument()
      expect(screen.getByTestId('adjust-employee-salary-amount-input')).toBeInTheDocument()
    })

    it('should render percentage increase input', () => {
      render(<TestWrapper />)

      expect(screen.getByTestId('adjust-employee-salary-percentage-label')).toBeInTheDocument()
      expect(screen.getByTestId('adjust-employee-salary-percentage-input')).toBeInTheDocument()
    })

    it('should update label based on frequency', () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const label = screen.getByTestId('adjust-employee-salary-amount-label')
      expect(label.textContent).toContain('annually')
    })
  })

  describe('Positive Value Input (Salary Increase)', () => {
    it('should accept positive amount values', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: '5000' } })

      await waitFor(() => {
        expect(amountInput.value).toBe('5000')
      })
    })

    it('should accept positive percentage values', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      fireEvent.change(percentageInput, { target: { value: '10' } })

      await waitFor(() => {
        expect(percentageInput.value).toBe('10')
      })
    })

    it('should limit decimal places to 2', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: '1500.999' } })

      await waitFor(() => {
        // Should truncate to 2 decimal places
        expect(amountInput.value).toMatch(/^1500\.\d{2}$/)
      })
    })
  })

  describe('Negative Value Input (Salary Reduction) - NEW FEATURE', () => {
    it('should accept negative amount values', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: '-5000' } })

      await waitFor(() => {
        expect(amountInput.value).toBe('-5000')
      })
    })

    it('should accept negative percentage values', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      fireEvent.change(percentageInput, { target: { value: '-10' } })

      await waitFor(() => {
        expect(percentageInput.value).toBe('-10')
      })
    })

    it('should handle typing negative sign first', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      // User types minus sign first
      fireEvent.change(amountInput, { target: { value: '-' } })
      await waitFor(() => {
        expect(amountInput.value).toBe('-')
      })

      // Then types numbers
      fireEvent.change(amountInput, { target: { value: '-5000' } })
      await waitFor(() => {
        expect(amountInput.value).toBe('-5000')
      })
    })
  })

  describe('Validation Rules', () => {
    it('should reject non-numeric input', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      fireEvent.change(amountInput, { target: { value: 'abc' } })

      await waitFor(() => {
        // Non-numeric input should be rejected or cleared
        expect(amountInput.value).not.toBe('abc')
      })
    })

    it('should enforce maximum amount value', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      // Try to enter value exceeding max (100M)
      fireEvent.change(amountInput, { target: { value: '200000000' } })

      // Component should either limit or show validation error
      await waitFor(() => {
        const parsedValue = parseFloat(amountInput.value)

        // Handle empty/invalid input - component should reject/clear the input
        if (amountInput.value === '' || Number.isNaN(parsedValue)) {
          expect(amountInput.value).toBe('')
        } else {
          // Otherwise, assert the numeric value is within the maximum limit
          expect(parsedValue).toBeLessThanOrEqual(100000000)
        }
      })
    })

    it('should enforce maximum percentage value (100%)', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      // Try to enter value exceeding max
      fireEvent.change(percentageInput, { target: { value: '150' } })

      await waitFor(() => {
        const parsedValue = parseFloat(percentageInput.value)

        // Guard against NaN and empty values
        if (percentageInput.value === '' || !Number.isFinite(parsedValue)) {
          // Component should reject/clear invalid input
          expect(percentageInput.value).toBe('')
        } else {
          // Otherwise, verify the numeric bound constraint
          expect(parsedValue).toBeLessThanOrEqual(100)
        }
      })
    })

    it('should allow percentage reduction up to -100%', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      fireEvent.change(percentageInput, { target: { value: '-100' } })

      await waitFor(() => {
        expect(percentageInput.value).toBe('-100')
      })
    })

    it('should reject percentage reduction beyond -100%', async () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      fireEvent.change(percentageInput, { target: { value: '-150' } })

      // Should be limited to -100
      await waitFor(() => {
        const parsedValue = parseFloat(percentageInput.value)

        // Guard against NaN and empty values
        if (percentageInput.value === '' || !Number.isFinite(parsedValue)) {
          // Component should reject/clear invalid input
          expect(percentageInput.value).toBe('')
        } else {
          // Otherwise, verify the numeric bound constraint
          expect(parsedValue).toBeGreaterThanOrEqual(-100)
        }
      })
    })
  })

  describe('Mutual Exclusivity (Disabled State)', () => {
    it('should disable percentage when amount has value', async () => {
      render(
        <TestWrapper
          adjustmentFrequency="annually"
          defaultValues={{ amountIncrease: 5000, percentageIncrease: null }}
        />
      )

      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      await waitFor(() => {
        expect(percentageInput).toBeDisabled()
      })
    })

    it('should disable amount when percentage has value', async () => {
      render(
        <TestWrapper adjustmentFrequency="annually" defaultValues={{ amountIncrease: null, percentageIncrease: 10 }} />
      )

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      await waitFor(() => {
        expect(amountInput).toBeDisabled()
      })
    })

    it('should allow clearing amount input', async () => {
      const user = userEvent.setup()

      render(<TestWrapper />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement

      // User types amount
      await user.type(amountInput, '5000')

      // Wait for the value to appear
      await waitFor(() => {
        expect(amountInput.value).toBe('5000')
      })

      // User clears amount
      await user.clear(amountInput)

      // Input should be empty
      await waitFor(() => {
        expect(amountInput.value).toBe('')
      })
    })
  })

  describe('Input Modes and Accessibility', () => {
    it('should have correct input mode for decimal input', () => {
      render(<TestWrapper adjustmentFrequency="annually" />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement
      expect(amountInput.getAttribute('inputMode')).toBe('decimal')
    })
  })

  describe('Real-world User Interactions', () => {
    it('should handle typing in both fields sequentially', async () => {
      const user = userEvent.setup()

      render(<TestWrapper />)

      const amountInput = screen.getByTestId('adjust-employee-salary-amount-input') as HTMLInputElement
      const percentageInput = screen.getByTestId('adjust-employee-salary-percentage-input') as HTMLInputElement

      // User enters amount
      await user.type(amountInput, '5000')

      // Value should appear
      await waitFor(() => {
        expect(amountInput.value).toBe('5000')
      })

      // User clears amount
      await user.clear(amountInput)

      await waitFor(() => {
        expect(amountInput.value).toBe('')
      })

      // User can type in percentage
      await user.type(percentageInput, '10')

      await waitFor(() => {
        expect(percentageInput.value).toBe('10')
      })
    })
  })
})
