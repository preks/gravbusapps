'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, Button, Input, Label, Spinner, useTranslation } from '@newwork/nw-design-system'
import { OrgchartClient } from '@/common/network/orgchart/OrgchartClient'
import peopleTranslations from './_i18n'
import {
  buildOuEnrichmentMap,
  fetchPeopleOrgchartStructure,
  resolveCreateDepartmentParentContext,
  type CreateDepartmentParentContext
} from './peopleDepartmentOrgchart'
import type { PeopleOrganizationalUnitRow } from './peopleStructureData'

export type PeopleAddDepartmentFormProps = {
  accessToken: string
  structureId: string
  embedded?: boolean
  onSuccess?: () => void
}

export function PeopleAddDepartmentForm({ accessToken, structureId, onSuccess }: PeopleAddDepartmentFormProps) {
  const { t } = useTranslation(peopleTranslations as unknown as Record<string, string>)
  const [name, setName] = useState('')
  const [loadingContext, setLoadingContext] = useState(true)
  const [createContext, setCreateContext] = useState<CreateDepartmentParentContext | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingContext(true)
    setContextError(null)
    void fetchPeopleOrgchartStructure(accessToken, structureId)
      .then(({ nodes }) => {
        if (cancelled) return
        const ctx = resolveCreateDepartmentParentContext(nodes)
        setCreateContext(ctx)
        if (!ctx) {
          setContextError(t('department-add-error-no-parent'))
        }
      })
      .catch(e => {
        if (cancelled) return
        setContextError(e instanceof Error ? e.message : t('error-load'))
        setCreateContext(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, structureId, t])

  const handleSubmit = useCallback(async () => {
    if (!createContext || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const client = new OrgchartClient()
      client.setAccessToken(accessToken)
      const body = {
        type: 'organization_unit',
        parentNode: createContext.parentNodeId,
        data: {
          organizationalUnitData: {
            name: name.trim(),
            description: '',
            type: 'DEPARTMENT'
          },
          rank: createContext.rank
        }
      }
      await client.createOrganizationalUnitNode(structureId, body, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error-load'))
    } finally {
      setBusy(false)
    }
  }, [accessToken, createContext, name, onSuccess, structureId, t])

  if (loadingContext) {
    return (
      <div className="gba:flex gba:items-center gba:gap-3 gba:py-6">
        <Spinner size="md" />
        <span className="gba:text-sm gba:text-muted-foreground">{t('department-form-loading-context')}</span>
      </div>
    )
  }

  if (contextError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{contextError}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label htmlFor="people-add-dept-name">{t('department-field-name')}</Label>
        <Input
          id="people-add-dept-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('department-field-name-placeholder')}
          autoComplete="off"
        />
      </div>
      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button type="button" disabled={busy || !name.trim()} onClick={() => void handleSubmit()}>
          {busy ? t('department-form-saving') : t('department-form-save-add')}
        </Button>
      </div>
    </div>
  )
}

export type PeopleEditDepartmentFormProps = {
  accessToken: string
  structureId: string
  row: PeopleOrganizationalUnitRow
  embedded?: boolean
  onSuccess?: () => void
}

export function PeopleEditDepartmentForm({ accessToken, structureId, row, onSuccess }: PeopleEditDepartmentFormProps) {
  const { t } = useTranslation(peopleTranslations as unknown as Record<string, string>)
  const [name, setName] = useState(row.name)
  /** Kept in sync from row / orgchart hydrate; sent on save so existing descriptions are not wiped. */
  const preservedDescriptionRef = useRef(row.description ?? '')
  const [rank, setRank] = useState<number>(row.rank ?? 0)
  const [orgchartUnitType, setOrgchartUnitType] = useState(row.orgchartUnitType ?? 'DEPARTMENT')
  const [companyId, setCompanyId] = useState<string | null>(row.companyId ?? null)
  const [costCenterId, setCostCenterId] = useState<string | null>(row.costCenterId ?? null)
  const [costCenterName, setCostCenterName] = useState<string | null>(row.costCenterName ?? null)
  const [resolvedNodeId, setResolvedNodeId] = useState<string | null>(row.nodeId ?? null)
  const [loadingHydrate, setLoadingHydrate] = useState(!row.nodeId?.trim())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(row.name)
    preservedDescriptionRef.current = row.description ?? ''
    setRank(row.rank ?? 0)
    setOrgchartUnitType(row.orgchartUnitType ?? 'DEPARTMENT')
    setCompanyId(row.companyId ?? null)
    setCostCenterId(row.costCenterId ?? null)
    setCostCenterName(row.costCenterName ?? null)
  }, [
    row.id,
    row.name,
    row.description,
    row.rank,
    row.orgchartUnitType,
    row.companyId,
    row.costCenterId,
    row.costCenterName
  ])

  useEffect(() => {
    setResolvedNodeId(row.nodeId?.trim() ? row.nodeId : null)
  }, [row.id, row.nodeId])

  useEffect(() => {
    if (row.nodeId?.trim()) {
      setLoadingHydrate(false)
      return
    }
    let cancelled = false
    setLoadingHydrate(true)
    void fetchPeopleOrgchartStructure(accessToken, structureId)
      .then(({ nodes }) => {
        if (cancelled) return
        const map = buildOuEnrichmentMap(nodes)
        const e = map.get(row.id)
        if (e) {
          setName(row.name)
          preservedDescriptionRef.current = e.description
          setRank(e.rank)
          setOrgchartUnitType(e.orgchartUnitType)
          setCompanyId(e.companyId ?? null)
          setCostCenterId(e.costCenterId ?? null)
          setCostCenterName(e.costCenterName ?? null)
          setResolvedNodeId(e.nodeId)
        } else {
          setResolvedNodeId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHydrate(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, row.id, row.nodeId, structureId])

  const handleSubmit = useCallback(async () => {
    const nodeId = resolvedNodeId?.trim()
    if (!nodeId || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const client = new OrgchartClient()
      client.setAccessToken(accessToken)
      const body = {
        type: 'organization_unit',
        id: nodeId,
        data: {
          organizationalUnitData: {
            company: { companyId: companyId ?? null },
            costCenter: {
              costCenterId: costCenterId ?? null,
              costCenterName: costCenterName ?? null
            },
            name: name.trim(),
            description: preservedDescriptionRef.current.trim(),
            organizationUnitId: row.id,
            type: orgchartUnitType
          },
          rank
        }
      }
      await client.updateOrganizationalUnitNode(structureId, body, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error-load'))
    } finally {
      setBusy(false)
    }
  }, [
    accessToken,
    companyId,
    costCenterId,
    costCenterName,
    name,
    onSuccess,
    orgchartUnitType,
    rank,
    resolvedNodeId,
    row.id,
    structureId,
    t
  ])

  if (!resolvedNodeId && loadingHydrate) {
    return (
      <div className="gba:flex gba:items-center gba:gap-3 gba:py-6">
        <Spinner size="md" />
        <span className="gba:text-sm gba:text-muted-foreground">{t('department-form-loading-context')}</span>
      </div>
    )
  }

  if (!resolvedNodeId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('department-edit-error-no-node')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label htmlFor="people-edit-dept-name">{t('department-field-name')}</Label>
        <Input
          id="people-edit-dept-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('department-field-name-placeholder')}
          autoComplete="off"
        />
      </div>
      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button type="button" disabled={busy || !name.trim()} onClick={() => void handleSubmit()}>
          {busy ? t('department-form-saving') : t('department-form-save-edit')}
        </Button>
      </div>
    </div>
  )
}
