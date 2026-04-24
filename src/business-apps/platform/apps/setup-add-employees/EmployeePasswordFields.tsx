'use client'

import { useCallback, useId, useState } from 'react'
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label
} from '@newwork/nw-design-system'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { generateStrongPassword } from './generateStrongPassword'

export type EmployeePasswordFieldLabels = {
  newPassword: string
  confirmPassword: string
  generate: string
  showPassword: string
  hidePassword: string
}

export type EmployeePasswordFieldsProps = {
  idPrefix: string
  newPassword: string
  confirmPassword: string
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  labels: EmployeePasswordFieldLabels
  /** When false, the generate control is omitted. */
  showGenerate?: boolean
  disabled?: boolean
  /** When true, both fields are native `required` (use inside a `<form>` with a submit button). */
  inputsRequired?: boolean
}

export function EmployeePasswordFields({
  idPrefix,
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
  labels,
  showGenerate = true,
  disabled = false,
  inputsRequired = false
}: EmployeePasswordFieldsProps) {
  const reactId = useId()
  const newId = `${idPrefix}-new-${reactId}`
  const confirmId = `${idPrefix}-confirm-${reactId}`
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const onGenerate = useCallback(() => {
    const next = generateStrongPassword()
    onNewPasswordChange(next)
    onConfirmPasswordChange(next)
    setShowNew(true)
    setShowConfirm(true)
  }, [onConfirmPasswordChange, onNewPasswordChange])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      {showGenerate ? (
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={disabled}>
            {labels.generate}
          </Button>
        </div>
      ) : null}
      <div className="gba:space-y-2">
        <Label htmlFor={newId}>
          {labels.newPassword}
          {inputsRequired ? (
            <span className="gba:text-destructive" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </Label>
        <InputGroup className="gba:w-full" disabled={disabled}>
          <InputGroupAddon align="inline-start">
            <Lock />
          </InputGroupAddon>
          <InputGroupInput
            id={newId}
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => onNewPasswordChange(e.target.value)}
            autoComplete="new-password"
            required={inputsRequired}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="iconXs"
              onClick={() => setShowNew(v => !v)}
              aria-label={showNew ? labels.hidePassword : labels.showPassword}
            >
              {showNew ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="gba:space-y-2">
        <Label htmlFor={confirmId}>
          {labels.confirmPassword}
          {inputsRequired ? (
            <span className="gba:text-destructive" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </Label>
        <InputGroup className="gba:w-full" disabled={disabled}>
          <InputGroupAddon align="inline-start">
            <Lock />
          </InputGroupAddon>
          <InputGroupInput
            id={confirmId}
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => onConfirmPasswordChange(e.target.value)}
            autoComplete="new-password"
            required={inputsRequired}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="iconXs"
              onClick={() => setShowConfirm(v => !v)}
              aria-label={showConfirm ? labels.hidePassword : labels.showPassword}
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}
