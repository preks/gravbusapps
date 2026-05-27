import React from 'react'
import { Spinner } from '@newwork/nw-design-system'

export interface TeamCompensationDistributionListLoadingAndErrorsProps {
  loading: boolean
  error: string | null
  sortedMembersLength: number
  emptyMessage: string
}

export function TeamCompensationDistributionListLoadingAndErrors({
  loading,
  error,
  sortedMembersLength,
  emptyMessage
}: Readonly<TeamCompensationDistributionListLoadingAndErrorsProps>) {
  return (
    <>
      {loading ? (
        <div className="gba:flex gba:justify-center gba:py-6">
          <Spinner />
        </div>
      ) : null}

      {error ? (
        <p className="gba:text-sm gba:text-destructive" data-testid="manager-team-distribution-list-error">
          {error}
        </p>
      ) : null}

      {loading === false && sortedMembersLength === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-team-distribution-list-empty">
          {emptyMessage}
        </p>
      ) : null}
    </>
  )
}
