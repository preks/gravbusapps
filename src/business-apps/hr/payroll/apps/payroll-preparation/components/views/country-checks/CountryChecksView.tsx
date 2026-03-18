import React from 'react'
import type { PayrollEmployee, PayrollCountry } from '../../../types/payrollTypes'
import { GermanyChecksView } from './GermanyChecksView'
import { RomaniaChecksView } from './RomaniaChecksView'

interface CountryChecksViewProps {
  employees: PayrollEmployee[]
  country: PayrollCountry
  t: (key: string) => string
}

export const CountryChecksView: React.FC<CountryChecksViewProps> = ({ employees, country, t }) => {
  if (country === 'DE') {
    return <GermanyChecksView employees={employees} t={t} />
  }
  if (country === 'RO') {
    return <RomaniaChecksView employees={employees} t={t} />
  }

  return (
    <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
      Country-specific checks are available for Germany (DE) and Romania (RO).
    </div>
  )
}
