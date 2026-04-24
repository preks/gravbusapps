'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
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
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import addEmployeesTranslations from './_i18n'
import {
  countManagersForOrganizationalUnitExcludingEmployee,
  fetchOrganizationalUnitsForStructurePage,
  type SetupAddEmployeesOuRow
} from './setupAddEmployeesHasura'
import { fetchEmployeeForEditForm, type EditEmployeeFormBootstrap } from './editEmployeeHasura'
import { pickPrimaryOrgAssignment, updateEmployeeOrganizationalUnitAssignment } from './employeeEditApi'
import { createSingleJobPositionByName } from './employeeOnboardingApi'

const DEPARTMENT_PAGE_SIZE = 30

export type EditEmployeeFormProps = {
  accessToken: string
  structureId: string
  employeeId: string
  onSuccess?: () => void
  embedded?: boolean
}

export function EditEmployeeForm({
  accessToken,
  structureId,
  employeeId,
  onSuccess,
  embedded = false
}: EditEmployeeFormProps) {
  const { t } = useTranslation(addEmployeesTranslations as unknown as Record<string, string>)

  const [bootstrap, setBootstrap] = useState<EditEmployeeFormBootstrap | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(true)

  const [orgUnits, setOrgUnits] = useState<SetupAddEmployeesOuRow[]>([])
  const [deptTotalCount, setDeptTotalCount] = useState(0)
  const [deptHasMore, setDeptHasMore] = useState(false)
  const [loadingDeptInitial, setLoadingDeptInitial] = useState(false)
  const [loadingDeptRefreshing, setLoadingDeptRefreshing] = useState(false)
  const [loadingDeptMore, setLoadingDeptMore] = useState(false)
  const [loadUnitsError, setLoadUnitsError] = useState<string | null>(null)

  const [organizationalUnitId, setOrganizationalUnitId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [jobPosition, setJobPosition] = useState('')
  const [isManager, setIsManager] = useState(false)

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialRef = useRef<{
    email: string
    jobTitle: string
    organizationalUnitId: string
    isManager: boolean
    jobPositionId: string
  } | null>(null)

  const departmentSearchRef = useRef('')
  const fetchGenerationRef = useRef(0)
  const loadedCountRef = useRef(0)

  const applyBootstrap = useCallback(
    (data: EditEmployeeFormBootstrap) => {
      const emp = data.employee
      if (!emp || !data.employeePosition?.organizationalUnitId) {
        return
      }
      const ouId = data.employeePosition.organizationalUnitId
      const jpId = data.employeePosition.jobPositionId ?? ''
      const jpName = data.employeePosition.jobPosition?.name ?? 'Employee'
      const commForEmail = (emp.communication ?? []).map(c => ({
        value: c.value ?? undefined,
        channelRef: c.channelRef ?? undefined
      }))
      const workEmail = getWorkEmailFromCommunication(commForEmail)
      const assignment = pickPrimaryOrgAssignment(data.employeeOrganizationalUnits, employeeId, jpId)
      const manager = assignment?.role === 'Manager'

      setBootstrap(data)
      setOrganizationalUnitId(ouId)
      setEmail(workEmail)
      setJobPosition((jpName ?? '').trim() || 'Employee')
      setIsManager(manager)
      initialRef.current = {
        email: workEmail,
        jobTitle: (jpName ?? '').trim() || 'Employee',
        organizationalUnitId: ouId,
        isManager: manager,
        jobPositionId: jpId
      }
    },
    [employeeId]
  )

  useEffect(() => {
    if (!accessToken?.trim() || !structureId || !employeeId) {
      setBootstrap(null)
      setLoadError(null)
      setLoadingInitial(false)
      return
    }
    let cancelled = false
    setLoadingInitial(true)
    setLoadError(null)
    void fetchEmployeeForEditForm(accessToken, employeeId, structureId)
      .then(data => {
        if (cancelled) return
        if (!data.employee) {
          setLoadError(t('edit-error-no-employee'))
          setBootstrap(null)
          return
        }
        if (!data.employeePosition?.organizationalUnitId) {
          setLoadError(t('edit-error-no-position'))
          setBootstrap(null)
          return
        }
        applyBootstrap(data)
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : t('edit-error-load'))
        setBootstrap(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, structureId, employeeId, applyBootstrap, t])

  const resetAndFetchDepartments = useCallback(
    async (search: string, options?: { isInitialMount?: boolean; pinOu?: { id: string; name: string } | null }) => {
      const isInitialMount = Boolean(options?.isInitialMount)
      const pinOu = options?.pinOu
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
        let nextRows = [...rows]
        if (pinOu?.id && !nextRows.some(r => r.id === pinOu.id)) {
          nextRows = [{ id: pinOu.id, name: pinOu.name }, ...nextRows]
        }
        setOrgUnits(nextRows)
        loadedCountRef.current = nextRows.length
        setDeptTotalCount(totalCount)
        setDeptHasMore(nextRows.length < totalCount)
        setOrganizationalUnitId(prev => {
          if (pinOu?.id && prev === pinOu.id) return prev
          if (prev && nextRows.some(r => r.id === prev)) return prev
          if (prev) return prev
          return nextRows[0]?.id ?? null
        })
      } catch (e) {
        if (fetchGenerationRef.current !== gen) return
        setLoadUnitsError(e instanceof Error ? e.message : t('load-error-generic'))
        setOrgUnits([])
        loadedCountRef.current = 0
        setDeptTotalCount(0)
        setDeptHasMore(false)
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
    if (!accessToken?.trim() || !structureId || loadingInitial || !bootstrap) {
      return
    }
    const pin = bootstrap.employeePosition?.organizationalUnit
    void resetAndFetchDepartments('', {
      isInitialMount: true,
      pinOu: pin?.id ? { id: pin.id, name: pin.name ?? pin.id } : null
    })
    return () => {
      fetchGenerationRef.current += 1
    }
  }, [accessToken, structureId, bootstrap, loadingInitial, resetAndFetchDepartments])

  const comboboxOptions = useMemo(() => orgUnits.map(u => ({ value: u.id, label: u.name })), [orgUnits])

  const onSubmit = useCallback(async () => {
    setError(null)
    setMessage(null)
    if (!accessToken?.trim() || !bootstrap?.employee || !initialRef.current) {
      setError(t('error-missing-token'))
      return
    }
    if (!structureId || !organizationalUnitId) {
      setError(t('error-dept-required'))
      return
    }
    const empNames = bootstrap.employee
    const firstOk = (empNames.firstName ?? '').trim()
    const lastOk = (empNames.lastName ?? '').trim()
    if (!firstOk || !lastOk) {
      setError(t('edit-error-name-required'))
      return
    }
    const workEmailForAccount = getWorkEmailFromCommunication(
      (bootstrap.employee.communication ?? []).map(c => ({
        value: c.value ?? undefined,
        channelRef: c.channelRef ?? undefined
      }))
    )
    if (!workEmailForAccount.trim()) {
      setError(t('edit-error-no-email'))
      return
    }

    const init = initialRef.current
    const jpIdInitial = init.jobPositionId
    const jobTitleChanged = jobPosition.trim() !== init.jobTitle
    const ouChanged = organizationalUnitId !== init.organizationalUnitId
    const roleChanged = isManager !== init.isManager

    if (isManager && (ouChanged || roleChanged || !init.isManager)) {
      try {
        const others = await countManagersForOrganizationalUnitExcludingEmployee(
          accessToken,
          structureId,
          organizationalUnitId,
          employeeId
        )
        if (others > 0) {
          setError(t('error-manager-already-exists'))
          return
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('edit-error-save'))
        return
      }
    }

    setBusy(true)
    try {
      const pos = bootstrap.employeePosition
      if (!pos?.jobPositionId) {
        throw new Error(t('edit-error-no-position'))
      }

      let jobPositionIdToUse = pos.jobPositionId
      if (jobTitleChanged) {
        jobPositionIdToUse = await createSingleJobPositionByName(accessToken, jobPosition.trim() || 'Employee')
      }

      const assignment = pickPrimaryOrgAssignment(bootstrap.employeeOrganizationalUnits, employeeId, jpIdInitial)
      if (!assignment?.id) {
        throw new Error(t('edit-error-no-assignment'))
      }

      const assignmentNeedsWrite =
        jobTitleChanged || ouChanged || roleChanged || jobPositionIdToUse !== assignment.jobPositionId

      if (assignmentNeedsWrite) {
        await updateEmployeeOrganizationalUnitAssignment({
          accessToken,
          assignmentId: assignment.id,
          structureId,
          organizationalUnitId,
          employeeId,
          jobPositionId: jobPositionIdToUse,
          assignManagerRole: isManager
        })
      }

      const fresh = await fetchEmployeeForEditForm(accessToken, employeeId, structureId)
      if (!fresh.employee || !fresh.employeePosition?.organizationalUnitId) {
        throw new Error(t('edit-error-load'))
      }
      applyBootstrap(fresh)
      setMessage(t('edit-msg-saved'))
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('edit-error-save'))
    } finally {
      setBusy(false)
    }
  }, [
    accessToken,
    applyBootstrap,
    bootstrap,
    employeeId,
    isManager,
    jobPosition,
    onSuccess,
    organizationalUnitId,
    structureId,
    t
  ])

  const formReady =
    !!bootstrap?.employee &&
    !!accessToken?.trim() &&
    !!structureId &&
    !loadingInitial &&
    !loadError &&
    !loadingDeptInitial &&
    !loadUnitsError &&
    deptTotalCount > 0

  const innerLoading = loadingInitial || (bootstrap && loadingDeptInitial)

  const inner = (
    <>
      {innerLoading ? (
        <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3">
          <Spinner size="md" />
          <span className="gba:text-sm gba:text-muted-foreground">{t('edit-loading')}</span>
        </div>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {loadUnitsError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadUnitsError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadingInitial && !loadError && bootstrap && !loadingDeptInitial && !loadUnitsError && deptTotalCount === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>{t('error-no-org-units')}</AlertDescription>
        </Alert>
      ) : null}

      {formReady ? (
        <>
          <div className="gba:space-y-2">
            <Label htmlFor="edit-employee-department">{t('label-department')}</Label>
            <Combobox
              id="edit-employee-department"
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
            <Label htmlFor="edit-first-name">{t('label-first-name')}</Label>
            <Input
              id="edit-first-name"
              value={(bootstrap.employee?.firstName ?? '').trim()}
              readOnly
              disabled
              autoComplete="given-name"
              className="gba:cursor-not-allowed gba:opacity-80"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="edit-last-name">{t('label-last-name')}</Label>
            <Input
              id="edit-last-name"
              value={(bootstrap.employee?.lastName ?? '').trim()}
              readOnly
              disabled
              autoComplete="family-name"
              className="gba:cursor-not-allowed gba:opacity-80"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="edit-email">{t('label-email')}</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              readOnly
              disabled
              autoComplete="off"
              className="gba:cursor-not-allowed gba:opacity-80"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="edit-job">{t('label-job-title')}</Label>
            <Input id="edit-job" value={jobPosition} onChange={e => setJobPosition(e.target.value)} />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox id="edit-is-manager" checked={isManager} onCheckedChange={v => setIsManager(v === true)} />
            <Label htmlFor="edit-is-manager" className="gba:cursor-pointer gba:font-normal">
              {t('label-is-manager')}
            </Label>
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
            {busy ? t('edit-action-saving') : t('edit-action-save')}
          </Button>
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
        <CardTitle>{t('edit-title')}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{t('edit-subtitle')}</p>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4">{inner}</CardContent>
    </Card>
  )
}
