'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { fetchActiveStructureBootstrap } from '../setup/lib/activeStructureBootstrap'
import {
  createBasicEmployeeFlow,
  fetchStructureOrgUnits,
  resolveUserIdByEmail,
  setInitialPassword,
  type OrgUnitOption
} from './employeeOnboardingApi'
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

  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingUnits, setLoadingUnits] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [jobPosition, setJobPosition] = useState('Employee')
  const [organizationalUnitId, setOrganizationalUnitId] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!accessToken?.trim() || !structureId) {
      setOrgUnits([])
      setOrganizationalUnitId(null)
      setLoadError(null)
      setLoadingUnits(false)
      return
    }

    let cancelled = false
    setLoadingUnits(true)
    setLoadError(null)

    void fetchStructureOrgUnits(structureId, accessToken)
      .then(units => {
        if (cancelled) return
        setOrgUnits(units)
        setOrganizationalUnitId(prev => {
          if (prev && units.some(u => u.id === prev)) return prev
          return units[0]?.id ?? null
        })
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : t('load-error-generic'))
        setOrgUnits([])
        setOrganizationalUnitId(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingUnits(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, structureId, t])

  const unitOptions = useMemo(() => orgUnits.map(u => ({ id: u.id, name: u.name })), [orgUnits])

  const onSubmit = async () => {
    setError(null)
    setMessage(null)
    if (!accessToken) {
      setError(t('error-missing-token'))
      return
    }
    if (!structureId || !organizationalUnitId) {
      setError(t('error-dept-required'))
      return
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError(t('error-name-email'))
      return
    }
    setBusy(true)
    try {
      const { employeeId } = await createBasicEmployeeFlow(accessToken, {
        structureId,
        organizationalUnitId,
        jobPositionName: jobPosition.trim() || 'Employee',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim()
      })

      let pwdInfo = ''
      if (password.trim()) {
        const userId = await resolveUserIdByEmail(accessToken, email.trim())
        if (userId) {
          await setInitialPassword(accessToken, userId, password.trim())
          pwdInfo = ` ${t('msg-password-set')}`
        } else {
          pwdInfo = ` ${t('msg-password-user-pending')}`
        }
      }

      setMessage(`${t('msg-employee-created')} (${employeeId}).${pwdInfo}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error-create-failed'))
    } finally {
      setBusy(false)
    }
  }

  const noActiveStructure = !bootstrapLoading && !bootstrapError && accessToken?.trim() && !structureId
  const formReady =
    !bootstrapLoading &&
    !bootstrapError &&
    accessToken?.trim() &&
    !!structureId &&
    !loadingUnits &&
    !loadError &&
    unitOptions.length > 0

  return (
    <div className="gba:bg-background gba:min-h-[50vh] gba:p-6">
      <Card className="gba:mx-auto gba:max-w-lg">
        <CardHeader>
          <CardTitle>{t('add-employees-title')}</CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">{t('add-employees-subtitle')}</p>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-4">
          {bootstrapError ? (
            <Alert variant="destructive">
              <AlertDescription>{bootstrapError}</AlertDescription>
            </Alert>
          ) : null}

          {noActiveStructure ? (
            <Alert variant="destructive">
              <AlertDescription>{t('error-no-active-structure')}</AlertDescription>
            </Alert>
          ) : null}

          {!accessToken?.trim() ? (
            <Alert variant="destructive">
              <AlertDescription>{t('error-missing-token')}</AlertDescription>
            </Alert>
          ) : null}

          {bootstrapLoading && accessToken ? (
            <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3">
              <Spinner size="md" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('loading-active-structure')}</span>
            </div>
          ) : null}

          {!bootstrapLoading && structureId && loadingUnits ? (
            <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3">
              <Spinner size="md" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('loading-departments')}</span>
            </div>
          ) : null}

          {loadError ? (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}

          {!loadingUnits &&
          !bootstrapLoading &&
          !bootstrapError &&
          accessToken &&
          structureId &&
          !loadError &&
          unitOptions.length === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>{t('error-no-departments')}</AlertDescription>
            </Alert>
          ) : null}

          {formReady ? (
            <>
              <div className="gba:space-y-2">
                <Label htmlFor="org-unit">{t('label-department')}</Label>
                <select
                  id="org-unit"
                  className="gba:flex gba:h-9 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-transparent gba:px-3 gba:py-1 gba:text-sm"
                  value={organizationalUnitId ?? ''}
                  onChange={e => setOrganizationalUnitId(e.target.value || null)}
                >
                  {unitOptions.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="first-name">{t('label-first-name')}</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="last-name">{t('label-last-name')}</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="email">{t('label-email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="job">{t('label-job-title')}</Label>
                <Input id="job" value={jobPosition} onChange={e => setJobPosition(e.target.value)} />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="pwd">{t('label-password-optional')}</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {message ? (
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="button" variant="default" onClick={() => void onSubmit()} disabled={busy}>
                {busy ? t('action-creating') : t('action-create')}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default AddEmployeesRemoteApp
