import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import {
  BasicInformationSection,
  StatusSourceSection,
  InvestmentSelectionSection,
  FinancialFieldsSection
} from './sections'
import { useFormFieldClearing } from '../hooks'

const LeadInformationSection: React.FC = () => {
  // Apply form field clearing logic
  useFormFieldClearing()

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: '0',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
        padding: '0',
        background: 'transparent'
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          padding: '0'
        }}
      >
        <BasicInformationSection />
        <StatusSourceSection />
        <InvestmentSelectionSection />
        <FinancialFieldsSection />
      </CardContent>
    </Card>
  )
}

export default LeadInformationSection
