'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import addEmployeesTranslations from './_i18n'
import { decodeAccessTokenSub } from '@/common/utils/decodeJwtSub'
import { fetchEmployeeForEditForm, type EditEmployeeFormBootstrap } from './editEmployeeHasura'
import { setInitialPassword } from './employeeOnboardingApi'
import { EmployeePasswordFields } from './EmployeePasswordFields'

export type ResetEmployeePasswordFormProps = {
  accessToken: string
  structureId: string
  employeeId: string
  onSuccess?: () => void
  embedded?: boolean
}

export function ResetEmployeePasswordForm({
  accessToken,
  structureId,
  employeeId,
  onSuccess,
  embedded = false
}: ResetEmployeePasswordFormProps) {
  const { t } = useTranslation(addEmployeesTranslations as unknown as Record<string, string>)

  const [bootstrap, setBootstrap] = useState<EditEmployeeFormBootstrap | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          setLoadError(t('reset-pwd-error-no-employee'))
          setBootstrap(null)
          return
        }
        setBootstrap(data)
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : t('reset-pwd-error-load'))
        setBootstrap(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, structureId, employeeId, t])

  const workEmail = bootstrap?.employee
    ? getWorkEmailFromCommunication(
        (bootstrap.employee.communication ?? []).map(c => ({
          value: c.value ?? undefined,
          channelRef: c.channelRef ?? undefined
        }))
      )
    : ''

  const hasUserId = Boolean(bootstrap?.employee?.userId?.trim())

  const targetUserIdForSelfCheck = bootstrap?.employee?.userId?.trim()
  const actorSub = decodeAccessTokenSub(accessToken)
  const isOwnPasswordReset = Boolean(actorSub && targetUserIdForSelfCheck && actorSub === targetUserIdForSelfCheck)

  const onSubmit = useCallback(async () => {
    setError(null)
    setMessage(null)
    if (!accessToken?.trim() || !bootstrap?.employee) {
      setError(t('error-missing-token'))
      return
    }
    if (!password.trim() || !confirmPassword.trim()) {
      setError(t('error-password-both-required'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('error-password-mismatch'))
      return
    }
    const userId = bootstrap.employee.userId?.trim()
    if (!userId) {
      setError(t('reset-pwd-error-no-user-id-on-record'))
      return
    }

    setBusy(true)
    try {
      await setInitialPassword(accessToken, userId, password.trim())
      setPassword('')
      setConfirmPassword('')
      setMessage(t('reset-pwd-msg-saved'))
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reset-pwd-error-save'))
    } finally {
      setBusy(false)
    }
  }, [accessToken, bootstrap, confirmPassword, onSuccess, password, t])

  const pwdLabels = {
    newPassword: t('label-password-new'),
    confirmPassword: t('label-password-confirm'),
    generate: t('action-generate-password'),
    showPassword: t('password-show'),
    hidePassword: t('password-hide')
  }

  const inner = (
    <>
      {loadingInitial ? (
        <div className="gba:flex gba:min-h-[120px] gba:items-center gba:justify-center gba:gap-3">
          <Spinner size="md" />
          <span className="gba:text-sm gba:text-muted-foreground">{t('reset-pwd-loading')}</span>
        </div>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadingInitial && !loadError && bootstrap?.employee && !hasUserId ? (
        <Alert variant="destructive">
          <AlertDescription>{t('reset-pwd-error-no-user-id-on-record')}</AlertDescription>
        </Alert>
      ) : null}

      {!loadingInitial && !loadError && bootstrap?.employee && hasUserId ? (
        <form
          className="gba:flex gba:flex-col gba:gap-4"
          onSubmit={e => {
            e.preventDefault()
            void onSubmit()
          }}
        >
          <p className="gba:text-sm gba:text-muted-foreground">
            {workEmail.trim() ? (
              <>
                {t('reset-pwd-hint-email-prefix')}{' '}
                <span className="gba:font-medium gba:text-foreground">{workEmail.trim()}</span>
              </>
            ) : (
              t('reset-pwd-hint-no-email')
            )}
          </p>
          {isOwnPasswordReset ? (
            <Alert>
              <AlertDescription>{t('reset-pwd-self-service-info')}</AlertDescription>
            </Alert>
          ) : null}
          <EmployeePasswordFields
            idPrefix="reset-employee-pwd"
            newPassword={password}
            confirmPassword={confirmPassword}
            onNewPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            labels={pwdLabels}
            disabled={busy}
            inputsRequired
          />

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

          <Button type="submit" variant="default" disabled={busy}>
            {busy ? t('reset-pwd-action-saving') : t('reset-pwd-action-save')}
          </Button>
        </form>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="gba:flex gba:flex-col gba:gap-4">{inner}</div>
  }

  return (
    <Card className="gba:mx-auto gba:max-w-lg">
      <CardHeader>
        <CardTitle>{t('reset-pwd-title')}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{t('reset-pwd-subtitle')}</p>
      </CardHeader>
      <CardContent className="gba:flex gba:flex-col gba:gap-4">{inner}</CardContent>
    </Card>
  )
}
