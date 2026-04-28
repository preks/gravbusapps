'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import addEmployeesTranslations from './_i18n'
import { EmployeePasswordFields } from './EmployeePasswordFields'
import {
  createBasicEmployeeFlow,
  findUserManagementUserMatchingEmployeeEmail,
  resolveUserIdByEmail,
  setInitialPassword
} from './employeeOnboardingApi'
import {
  countManagersForOrganizationalUnit,
  fetchOrganizationalUnitsForStructurePage,
  type SetupAddEmployeesOuRow
} from './setupAddEmployeesHasura'

const DEPARTMENT_PAGE_SIZE = 30

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export type AddEmployeeFormProps = {
  accessToken: string
  structureId: string
  /** Called after employee creation succeeds. */
  onSuccess?: (result: { employeeId: string }) => void
  /** Omit outer card for embedding (e.g. dialog in People app). */
  embedded?: boolean
}

export function AddEmployeeForm({ accessToken, structureId, onSuccess, embedded = false }: AddEmployeeFormProps) {
  const { t } = useTranslation(addEmployeesTranslations as unknown as Record<string, string>)

  const [orgUnits, setOrgUnits] = useState<SetupAddEmployeesOuRow[]>([])
  const [deptTotalCount, setDeptTotalCount] = useState(0)
  const [deptHasMore, setDeptHasMore] = useState(false)
  const [loadingDeptInitial, setLoadingDeptInitial] = useState(false)
  /** Search / reset refetch (keeps form visible; only initial mount uses full-page spinner). */
  const [loadingDeptRefreshing, setLoadingDeptRefreshing] = useState(false)
  const [loadingDeptMore, setLoadingDeptMore] = useState(false)
  const [loadUnitsError, setLoadUnitsError] = useState<string | null>(null)

  const [organizationalUnitId, setOrganizationalUnitId] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [jobPosition, setJobPosition] = useState('Employee')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isManager, setIsManager] = useState(false)

  const [busy, setBusy] = useState(false)
  const [checkingExistingUser, setCheckingExistingUser] = useState(false)
  const [duplicateUserDialogOpen, setDuplicateUserDialogOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const departmentSearchRef = useRef('')
  const fetchGenerationRef = useRef(0)
  const loadedCountRef = useRef(0)

  const resetAndFetchDepartments = useCallback(
    async (search: string, options?: { isInitialMount?: boolean }) => {
      const isInitialMount = Boolean(options?.isInitialMount)
      const gen = ++fetchGenerationRef.current
      departmentSearchRef.current = search
      if (isInitialMount) setLoadingDeptInitial(true)
      else setLoadingDeptRefreshing(true)
      setLoadUnitsError(null)
      try {
        const { rows, totalCount } = await fetchOrganizationalUnitsForStructurePage(accessToken, structureId, {
          limit: DEPARTMENT_PAGE_SIZE,
          offset: 0,
          search
        })
        if (fetchGenerationRef.current !== gen) return
        setOrgUnits(rows)
        loadedCountRef.current = rows.length
        setDeptTotalCount(totalCount)
        setDeptHasMore(rows.length < totalCount)
        setOrganizationalUnitId(prev => {
          if (prev && rows.some(r => r.id === prev)) return prev
          return rows[0]?.id ?? null
        })
      } catch (e) {
        if (fetchGenerationRef.current !== gen) return
        setLoadUnitsError(e instanceof Error ? e.message : t('load-error-generic'))
        setOrgUnits([])
        loadedCountRef.current = 0
        setDeptTotalCount(0)
        setDeptHasMore(false)
        setOrganizationalUnitId(null)
      } finally {
        if (fetchGenerationRef.current === gen) {
          if (isInitialMount) setLoadingDeptInitial(false)
          else setLoadingDeptRefreshing(false)
        }
      }
    },
    [accessToken, structureId, t]
  )

  const loadMoreDepartments = useCallback(async () => {
    if (
      !accessToken?.trim() ||
      !structureId ||
      !deptHasMore ||
      loadingDeptMore ||
      loadingDeptInitial ||
      loadingDeptRefreshing
    ) {
      return
    }
    setLoadingDeptMore(true)
    setLoadUnitsError(null)
    const search = departmentSearchRef.current
    const offset = loadedCountRef.current
    try {
      const { rows, totalCount } = await fetchOrganizationalUnitsForStructurePage(accessToken, structureId, {
        limit: DEPARTMENT_PAGE_SIZE,
        offset,
        search
      })
      if (rows.length === 0) {
        setDeptHasMore(false)
        return
      }
      const newLen = offset + rows.length
      loadedCountRef.current = newLen
      setOrgUnits(prev => [...prev, ...rows])
      setDeptHasMore(newLen < totalCount)
    } catch (e) {
      setLoadUnitsError(e instanceof Error ? e.message : t('load-error-generic'))
    } finally {
      setLoadingDeptMore(false)
    }
  }, [accessToken, structureId, deptHasMore, loadingDeptMore, loadingDeptInitial, loadingDeptRefreshing, t])

  useEffect(() => {
    if (!accessToken?.trim() || !structureId) {
      fetchGenerationRef.current += 1
      setOrgUnits([])
      loadedCountRef.current = 0
      setDeptTotalCount(0)
      setDeptHasMore(false)
      setOrganizationalUnitId(null)
      setLoadUnitsError(null)
      setLoadingDeptInitial(false)
      setLoadingDeptRefreshing(false)
      setLoadingDeptMore(false)
      return
    }

    void resetAndFetchDepartments('', { isInitialMount: true })
    return () => {
      fetchGenerationRef.current += 1
    }
  }, [accessToken, structureId, resetAndFetchDepartments])

  const performCreate = useCallback(async () => {
    if (!accessToken || !structureId || !organizationalUnitId) return
    const pwd = password.trim()
    setBusy(true)
    try {
      const { employeeId } = await createBasicEmployeeFlow(accessToken, {
        structureId,
        organizationalUnitId,
        jobPositionName: jobPosition.trim() || 'Employee',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        assignManagerRole: isManager
      })

      let pwdInfo = ''
      if (pwd) {
        const userId = await resolveUserIdByEmail(accessToken, email.trim())
        if (userId) {
          await setInitialPassword(accessToken, userId, pwd)
          pwdInfo = ` ${t('msg-password-set')}`
        } else {
          pwdInfo = ` ${t('msg-password-user-pending')}`
        }
      }

      setMessage(`${t('msg-employee-created')} (${employeeId}).${pwdInfo}`)
      onSuccess?.({ employeeId })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error-create-failed'))
    } finally {
      setBusy(false)
    }
  }, [
    accessToken,
    email,
    firstName,
    isManager,
    jobPosition,
    lastName,
    onSuccess,
    organizationalUnitId,
    password,
    structureId,
    t
  ])

  const onSubmit = useCallback(async () => {
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
    if (!isValidEmail(email)) {
      setError(t('error-email-invalid'))
      return
    }
    const pwd = password.trim()
    const pwdConfirm = confirmPassword.trim()
    if ((pwd && !pwdConfirm) || (!pwd && pwdConfirm)) {
      setError(t('error-password-partial'))
      return
    }
    if (pwd && pwdConfirm && pwd !== pwdConfirm) {
      setError(t('error-password-mismatch'))
      return
    }
    if (isManager) {
      try {
        const existingManagers = await countManagersForOrganizationalUnit(
          accessToken,
          structureId,
          organizationalUnitId
        )
        if (existingManagers > 0) {
          setError(t('error-manager-already-exists'))
          return
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('error-create-failed'))
        return
      }
    }

    setCheckingExistingUser(true)
    try {
      const existing = await findUserManagementUserMatchingEmployeeEmail(accessToken, email.trim())
      if (existing) {
        setDuplicateUserDialogOpen(true)
        return
      }
    } catch {
      setError(t('error-um-lookup'))
      return
    } finally {
      setCheckingExistingUser(false)
    }

    await performCreate()
  }, [
    accessToken,
    confirmPassword,
    email,
    firstName,
    isManager,
    jobPosition,
    lastName,
    organizationalUnitId,
    password,
    performCreate,
    structureId,
    t
  ])

  const onConfirmDuplicateCreate = useCallback(() => {
    setDuplicateUserDialogOpen(false)
    void performCreate()
  }, [performCreate])

  const comboboxOptions = useMemo(() => orgUnits.map(u => ({ value: u.id, label: u.name })), [orgUnits])

  const passwordFieldLabels = useMemo(
    () => ({
      newPassword: t('label-password-new'),
      confirmPassword: t('label-password-confirm'),
      generate: t('action-generate-password'),
      showPassword: t('password-show'),
      hidePassword: t('password-hide')
    }),
    [t]
  )

  const formReady =
    !!accessToken?.trim() && !!structureId && !loadingDeptInitial && !loadUnitsError && deptTotalCount > 0

  const inner = (
    <>
      {structureId && loadingDeptInitial ? (
        <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3">
          <Spinner size="md" />
          <span className="gba:text-sm gba:text-muted-foreground">{t('loading-departments')}</span>
        </div>
      ) : null}

      {loadUnitsError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadUnitsError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadingDeptInitial && !loadUnitsError && accessToken && structureId && deptTotalCount === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>{t('error-no-org-units')}</AlertDescription>
        </Alert>
      ) : null}

      {formReady ? (
        <>
          <div className="gba:space-y-2">
            <Label htmlFor="add-employee-department">
              {t('label-department')}
              <span className="gba:text-destructive" aria-hidden="true">
                {' '}
                *
              </span>
            </Label>
            <Combobox
              id="add-employee-department"
              className="gba:w-full"
              options={comboboxOptions}
              value={organizationalUnitId ?? ''}
              onValueChange={v => setOrganizationalUnitId(v || null)}
              placeholder={t('label-department-placeholder')}
              searchPlaceholder={t('label-department-search-placeholder')}
              emptyText={t('label-department-empty')}
              loading={loadingDeptRefreshing || loadingDeptMore}
              loadingText={t('loading-departments')}
              onSearch={q => {
                void resetAndFetchDepartments(q, { isInitialMount: false })
              }}
              onLoadMore={() => {
                void loadMoreDepartments()
              }}
              hasMore={deptHasMore}
              searchDebounce={300}
              align="start"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="first-name">
              {t('label-first-name')}
              <span className="gba:text-destructive" aria-hidden="true">
                {' '}
                *
              </span>
            </Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="last-name">
              {t('label-last-name')}
              <span className="gba:text-destructive" aria-hidden="true">
                {' '}
                *
              </span>
            </Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="email">
              {t('label-email')}
              <span className="gba:text-destructive" aria-hidden="true">
                {' '}
                *
              </span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="job">{t('label-job-title')}</Label>
            <Input id="job" value={jobPosition} onChange={e => setJobPosition(e.target.value)} />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox id="is-manager" checked={isManager} onCheckedChange={v => setIsManager(v === true)} />
            <Label htmlFor="is-manager" className="gba:cursor-pointer gba:font-normal">
              {t('label-is-manager')}
            </Label>
          </div>
          <div className="gba:space-y-2">
            <p className="gba:text-sm gba:font-medium gba:leading-none">{t('label-password-optional')}</p>
            <EmployeePasswordFields
              idPrefix="add-employee-pwd"
              newPassword={password}
              confirmPassword={confirmPassword}
              onNewPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              labels={passwordFieldLabels}
              disabled={busy}
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

          <Button
            type="button"
            variant="default"
            onClick={() => void onSubmit()}
            disabled={busy || checkingExistingUser || duplicateUserDialogOpen}
          >
            {busy ? t('action-creating') : checkingExistingUser ? t('action-checking-account') : t('action-create')}
          </Button>

          <AlertDialog open={duplicateUserDialogOpen} onOpenChange={setDuplicateUserDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dialog-existing-user-title')}</AlertDialogTitle>
                <AlertDialogDescription className="gba:space-y-2">
                  <span>{t('dialog-existing-user-body')}</span>
                  <span className="gba:block gba:font-medium gba:text-foreground">{email.trim()}</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">{t('dialog-existing-user-cancel')}</AlertDialogCancel>
                <AlertDialogAction type="button" onClick={onConfirmDuplicateCreate}>
                  {t('dialog-existing-user-confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="gba:flex gba:flex-col gba:gap-4">{inner}</div>
  }

  return (
    <Card className="gba:mx-auto gba:max-w-lg">
      <CardHeader>
        <CardTitle>{t('add-employees-title')}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{t('add-employees-subtitle')}</p>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4">{inner}</CardContent>
    </Card>
  )
}
