import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { BasicInformationSection, StatusSourceSection } from './sections'

const LeadInformationSection: React.FC = () => {
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
      </CardContent>
    </Card>
  )
}

export default LeadInformationSection
