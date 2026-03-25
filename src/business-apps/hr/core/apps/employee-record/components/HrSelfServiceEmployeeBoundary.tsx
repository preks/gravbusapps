'use client'

import React from 'react'
import { Spinner } from '@newwork/nw-design-system'
import type { Employee } from '../hooks/useEmployeeData'

const centerClass = 'gba:flex gba:min-h-screen gba:items-center gba:justify-center'

export interface HrSelfServiceEmployeeBoundaryProps {
  loading: boolean
  error: unknown
  employee: Employee | null | undefined
  loadingTestId: string
  errorTestId: string
  unavailableMessage: string
  children: (employee: Employee) => React.ReactNode
}

/**
 * Shared loading / error shell for HR self-service pages that require a resolved employee entity.
 */
export function HrSelfServiceEmployeeBoundary({
  loading,
  error,
  employee,
  loadingTestId,
  errorTestId,
  unavailableMessage,
  children
}: HrSelfServiceEmployeeBoundaryProps) {
  if (loading) {
    return (
      <div className={centerClass} data-testid={loadingTestId}>
        <Spinner />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className={`${centerClass} gba:text-muted-foreground`} data-testid={errorTestId}>
        <p>{unavailableMessage}</p>
      </div>
    )
  }

  return <>{children(employee)}</>
}
