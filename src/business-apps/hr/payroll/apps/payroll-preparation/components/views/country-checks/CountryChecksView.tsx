import React, { useState } from 'react'
import type { PayrollEmployee, PayrollCountry } from '../../../types/payrollTypes'
import { EmployeeDetailDrawer } from '../payroll-grid/EmployeeDetailDrawer'
import { GermanyChecksView } from './GermanyChecksView'
import { RomaniaChecksView } from './RomaniaChecksView'

interface CountryChecksViewProps {
  employees: PayrollEmployee[]
  country: PayrollCountry
  t: (key: string) => string
}

export const CountryChecksView: React.FC<CountryChecksViewProps> = ({ employees, country, t }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null)

  if (country === 'DE') {
    return (
      <>
        <GermanyChecksView employees={employees} onSelectEmployee={setSelectedEmployee} t={t} />
        {selectedEmployee && (
          <EmployeeDetailDrawer
            employee={selectedEmployee}
            country={country}
            onClose={() => setSelectedEmployee(null)}
            t={t}
          />
        )}
      </>
    )
  }
  if (country === 'RO') {
    return (
      <>
        <RomaniaChecksView employees={employees} onSelectEmployee={setSelectedEmployee} t={t} />
        {selectedEmployee && (
          <EmployeeDetailDrawer
            employee={selectedEmployee}
            country={country}
            onClose={() => setSelectedEmployee(null)}
            t={t}
          />
        )}
      </>
    )
  }

  return (
    <div
      className="gba:text-center gba:py-12 gba:text-muted-foreground"
      data-testid="payroll-prep-country-checks-unsupported"
    >
      Country-specific checks are available for Germany (DE) and Romania (RO).
    </div>
  )
}
