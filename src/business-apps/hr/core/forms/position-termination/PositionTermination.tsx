'use client'

import React from 'react'
import { PositionTerminationProvider } from './context/PositionTerminationContext'
import { PositionTerminationForm } from './components/PositionTerminationForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface PositionTerminationProps extends BusinessAppContextProps {
  // The complete job position data comes from additionalData via jobPositionEntity flow context
  jobPositionId?: string
}

export const PositionTermination: React.FC<PositionTerminationProps> = ({
  accessToken,
  additionalData,
  jobPositionId: directJobPositionId
}) => {
  // Extract jobPositionId from flow context structure or direct prop
  const extractJobPositionIdFromContext = (data: any): string | null => {
    // Method 1: Direct prop
    if (directJobPositionId) {
      return directJobPositionId
    }

    // Method 2: Direct ID in additionalData
    if (data?.id) {
      return data.id
    }

    // Method 3: Extract from Kogito task payload structure
    if (data?.psi_taskPayload?.psi_initialParameters?.jobPositionId) {
      return data.psi_taskPayload.psi_initialParameters.jobPositionId
    }

    // Method 4: Check if additionalData has the context data ID as a key (legacy flow context)
    if (data?.flowItems) {
      const terminateFlow = data.flowItems.find(
        (item: any) => item.processName === 'terminateJobPosition' && item.context?.contextName === 'jobPositionEntity'
      )

      if (terminateFlow?.context?.contextData) {
        const jobPositionContext = terminateFlow.context.contextData.find(
          (ctx: any) => ctx.contextDataName === 'jobPositionId' && ctx.mainContext === true
        )

        if (jobPositionContext?.id && data[jobPositionContext.id]) {
          return data[jobPositionContext.id]
        }
      }
    }

    // Method 5: Look for common keys that might contain the jobPositionId
    if (data) {
      // Look for any UUID-like values in the data
      for (const [, value] of Object.entries(data)) {
        // Check if this looks like a UUID (basic check)
        if (
          typeof value === 'string' &&
          value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ) {
          return value
        }
      }
    }

    return null
  }

  const jobPositionId = extractJobPositionIdFromContext(additionalData)

  // Show error message if no job position ID can be extracted
  if (!jobPositionId) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundColor: 'var(--nw-color-muted)',
          padding: 'var(--nw-spacing-4)'
        }}
      >
        <div className="text-center" style={{ color: 'var(--nw-color-muted-foreground)' }}>
          <h2 className="text-lg font-semibold mb-2">Position Not Found</h2>
          <p>No job position data was provided via flow context.</p>
          <p className="text-sm mt-2">
            Complete job position object should be passed via additionalData from jobPositionEntity flow context.
          </p>
        </div>
      </div>
    )
  }

  return (
    <PositionTerminationProvider jobPositionId={jobPositionId} accessToken={accessToken}>
      <PositionTerminationForm />
    </PositionTerminationProvider>
  )
}
