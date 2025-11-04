import React from 'react'
import { Card, CardContent, Alert, AlertDescription } from '@newwork/nw-design-system'
import { useOpportunityFormContext } from '../context/OpportunityFormContext'
import { OwnerBasicInfoSection, PipelineStageSection, AmountDateSection } from './sections'

const OpportunityInformationSection: React.FC = () => {
  const { error } = useOpportunityFormContext()

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
          boxShadow: 'none',
          padding: '0',
          background: 'transparent'
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <OwnerBasicInfoSection />
        <PipelineStageSection />
        <AmountDateSection />
      </CardContent>
    </Card>
  )
}

export default OpportunityInformationSection
