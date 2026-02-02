/**
 * Unit Tests for Salary Adjustment Calculations
 *
 * Tests cover:
 * - Positive adjustments (increases)
 * - Negative adjustments (reductions) - NEW FEATURE
 * - Different frequency modes (annually, monthly, hourly)
 * - Amount vs percentage adjustments
 * - Edge cases and validation
 */

import { calculateSalaryAdjustment } from '../utils/calculateSalaryAdjustment'
import type { AdjustEmployeeSalaryFormValues } from '../types'

describe('calculateSalaryAdjustment', () => {
  // Base salary data for tests
  const baseSalary = {
    annual: 60000,
    monthly: 5000,
    hourly: 30
  }

  describe('Annual Frequency - Positive Adjustments', () => {
    it('should calculate annual amount increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 5000,
        percentageIncrease: null,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(65000)
      expect(result.newMonthlySalary).toBe(65000 / 12)
      expect(result.newHourlySalary).toBeNull()
      expect(result.adjustmentValue).toBe(5000)
      expect(result.adjustmentType).toBe('amount')
    })

    it('should calculate annual percentage increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: 10,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(66000) // 60000 + 10%
      expect(result.newMonthlySalary).toBe(66000 / 12)
      expect(result.adjustmentValue).toBe(10)
      expect(result.adjustmentType).toBe('percentage')
    })
  })

  describe('Annual Frequency - Negative Adjustments (Salary Reduction)', () => {
    it('should calculate annual amount decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: -5000, // Negative value for reduction
        percentageIncrease: null,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(55000) // 60000 - 5000
      expect(result.newMonthlySalary).toBe(55000 / 12)
      expect(result.newHourlySalary).toBeNull()
      expect(result.adjustmentValue).toBe(-5000)
      expect(result.adjustmentType).toBe('amount')
    })

    it('should calculate annual percentage decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: -10, // Negative percentage for reduction
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(54000) // 60000 - 10%
      expect(result.newMonthlySalary).toBe(54000 / 12)
      expect(result.adjustmentValue).toBe(-10)
      expect(result.adjustmentType).toBe('percentage')
    })

    it('should handle reduction exceeding current salary (negative result)', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: -70000, // More than current salary
        percentageIncrease: null,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // This should result in negative salary - validation should catch this in UI
      expect(result.newAnnualSalary).toBe(-10000)
      expect(result.newMonthlySalary).toBe(-10000 / 12)
    })
  })

  describe('Monthly Frequency - Positive Adjustments', () => {
    it('should calculate monthly amount increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 500,
        percentageIncrease: null,
        adjustmentFrequency: 'monthly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(66000) // 60000 + (500 * 12)
      expect(result.newMonthlySalary).toBe(66000 / 12)
      expect(result.adjustmentValue).toBe(500)
    })

    it('should calculate monthly percentage increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: 10,
        adjustmentFrequency: 'monthly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // 10% of 5000 monthly = 500, * 12 = 6000 annual increase
      expect(result.newAnnualSalary).toBe(66000)
      expect(result.newMonthlySalary).toBe(66000 / 12)
    })
  })

  describe('Monthly Frequency - Negative Adjustments (Salary Reduction)', () => {
    it('should calculate monthly amount decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: -300, // Reduce by 300/month
        percentageIncrease: null,
        adjustmentFrequency: 'monthly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newAnnualSalary).toBe(56400) // 60000 - (300 * 12)
      expect(result.newMonthlySalary).toBe(56400 / 12)
      expect(result.adjustmentValue).toBe(-300)
    })

    it('should calculate monthly percentage decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: -5, // Reduce by 5% monthly
        adjustmentFrequency: 'monthly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // -5% of 5000 = -250, * 12 = -3000 annual
      expect(result.newAnnualSalary).toBe(57000) // 60000 - 3000
      expect(result.newMonthlySalary).toBe(57000 / 12)
    })
  })

  describe('Hourly Frequency - Positive Adjustments', () => {
    it('should calculate hourly amount increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 5,
        percentageIncrease: null,
        adjustmentFrequency: 'hourly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newHourlySalary).toBe(35) // 30 + 5
      expect(result.newAnnualSalary).toBeNull()
      expect(result.newMonthlySalary).toBeNull()
      expect(result.adjustmentValue).toBe(5)
    })

    it('should calculate hourly percentage increase correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: 10,
        adjustmentFrequency: 'hourly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newHourlySalary).toBe(33) // 30 + 10%
      expect(result.adjustmentValue).toBe(10)
    })
  })

  describe('Hourly Frequency - Negative Adjustments (Salary Reduction)', () => {
    it('should calculate hourly amount decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: -5, // Reduce by 5/hour
        percentageIncrease: null,
        adjustmentFrequency: 'hourly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newHourlySalary).toBe(25) // 30 - 5
      expect(result.newAnnualSalary).toBeNull()
      expect(result.newMonthlySalary).toBeNull()
      expect(result.adjustmentValue).toBe(-5)
    })

    it('should calculate hourly percentage decrease correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: -20, // Reduce by 20%
        adjustmentFrequency: 'hourly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      expect(result.newHourlySalary).toBe(24) // 30 - 20% = 24
      expect(result.adjustmentValue).toBe(-20)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle zero adjustment gracefully', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 0,
        percentageIncrease: null,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // Zero adjustment should return unchanged salary
      expect(result.newAnnualSalary).toBe(baseSalary.annual)
      expect(result.newMonthlySalary).toBe(baseSalary.annual / 12)
    })

    it('should handle missing hourly salary data when hourly frequency selected', () => {
      // Suppress expected warning for this edge case
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 5,
        percentageIncrease: null,
        adjustmentFrequency: 'hourly'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        null // No hourly salary
      )

      // Should return zero/null result
      expect(result.newHourlySalary).toBeNull()
      expect(result.adjustmentValue).toBe(0)

      // Verify warning was called
      expect(consoleWarnSpy).toHaveBeenCalledWith('Attempted hourly adjustment without hourly salary data')
      consoleWarnSpy.mockRestore()
    })

    it('should prioritize amount over percentage when both provided', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: 5000,
        percentageIncrease: 10,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // Amount should take priority
      expect(result.adjustmentType).toBe('amount')
      expect(result.adjustmentValue).toBe(5000)
      expect(result.newAnnualSalary).toBe(65000)
    })

    it('should handle null values correctly', () => {
      const values: Partial<AdjustEmployeeSalaryFormValues> = {
        amountIncrease: null,
        percentageIncrease: null,
        adjustmentFrequency: 'annually'
      }

      const result = calculateSalaryAdjustment(
        values as AdjustEmployeeSalaryFormValues,
        baseSalary.annual,
        baseSalary.monthly,
        baseSalary.hourly
      )

      // No adjustment values should return unchanged salary
      expect(result.newAnnualSalary).toBe(baseSalary.annual)
    })
  })
})
