'use client'

import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription, Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { fetchActiveStructureBootstrap } from '../setup/lib/activeStructureBootstrap'
import { AddEmployeeForm } from './AddEmployeeForm'
import addEmployeesTranslations from './_i18n'

type Props = {
  accessToken?: string
  /** Reserved for host metadata (e.g. namespace); structure comes from `/api/active-structure`. */
  additionalData?: Record<string, unknown>
}

export function AddEmployeesRemoteApp({ accessToken }: Props) {
  const { t } = useTranslation(addEmployeesTranslations as unknown as Record<string, string>)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [structureId, setStructureId] = useState('')

  useEffect(() => {
    if (!accessToken?.trim()) {
      setStructureId('')
      setBootstrapError(null)
      setBootstrapLoading(false)
      return
    }

    let cancelled = false
    setBootstrapLoading(true)
    setBootstrapError(null)

    void fetchActiveStructureBootstrap(accessToken)
      .then(bootstrap => {
        if (cancelled) return
        if (bootstrap.hasActiveStructure && bootstrap.structureId?.trim()) {
          setStructureId(bootstrap.structureId.trim())
        } else {
          setStructureId('')
        }
      })
      .catch(e => {
        if (cancelled) return
        setBootstrapError(e instanceof Error ? e.message : t('load-error-generic'))
        setStructureId('')
      })
      .finally(() => {
        if (!cancelled) setBootstrapLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, t])

  const noActiveStructure = !bootstrapLoading && !bootstrapError && accessToken?.trim() && !structureId

  return (
    <div className="gba:bg-background gba:min-h-[50vh] gba:p-6">
      {bootstrapError ? (
        <Card className="gba:mx-auto gba:max-w-lg">
          <Alert variant="destructive" className="gba:border-none">
            <AlertDescription>{bootstrapError}</AlertDescription>
          </Alert>
        </Card>
      ) : null}

      {noActiveStructure ? (
        <Card className="gba:mx-auto gba:max-w-lg">
          <Alert variant="destructive" className="gba:border-none">
            <AlertDescription>{t('error-no-active-structure')}</AlertDescription>
          </Alert>
        </Card>
      ) : null}

      {!accessToken?.trim() ? (
        <Card className="gba:mx-auto gba:max-w-lg">
          <Alert variant="destructive" className="gba:border-none">
            <AlertDescription>{t('error-missing-token')}</AlertDescription>
          </Alert>
        </Card>
      ) : null}

      {bootstrapLoading && accessToken ? (
        <Card className="gba:mx-auto gba:max-w-lg">
          <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3 gba:p-6">
            <Spinner size="md" />
            <span className="gba:text-sm gba:text-muted-foreground">{t('loading-active-structure')}</span>
          </div>
        </Card>
      ) : null}

      {!bootstrapLoading && !bootstrapError && accessToken?.trim() && structureId ? (
        <AddEmployeeForm accessToken={accessToken} structureId={structureId} />
      ) : null}
    </div>
  )
}

export default AddEmployeesRemoteApp
