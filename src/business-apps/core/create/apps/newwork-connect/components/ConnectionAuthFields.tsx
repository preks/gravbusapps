import React from 'react'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { CredentialBindField } from '@/common/components/credential-bind/CredentialBindField'
import type { CredentialBindOption } from '@/common/utils/credentialBindOptions'

export type AuthType = 'none' | 'bearer' | 'basic' | 'custom-header'

export interface AuthState {
  type: AuthType
  bearerToken: string
  basicUsername: string
  basicPassword: string
  headerName: string
  headerValue: string
}

export const DEFAULT_AUTH_STATE: AuthState = {
  type: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  headerName: '',
  headerValue: ''
}

const AUTH_CONFIG_KEY_PREFIX = 'auth.'

export const isAuthConfigKey = (key: string): boolean => key.startsWith(AUTH_CONFIG_KEY_PREFIX)

export const extractAuthState = (config: Record<string, string>): AuthState => {
  const rawType = config['auth.type'] || 'none'
  const type: AuthType =
    rawType === 'bearer' || rawType === 'basic' || rawType === 'custom-header' ? rawType : 'none'

  return {
    type,
    bearerToken: config['auth.bearerToken'] || '',
    basicUsername: config['auth.basicUsername'] || '',
    basicPassword: config['auth.basicPassword'] || '',
    headerName: config['auth.headerName'] || '',
    headerValue: config['auth.headerValue'] || ''
  }
}

export const buildAuthConfig = (auth: AuthState): Record<string, string> => {
  if (auth.type === 'none') return {}

  const result: Record<string, string> = { 'auth.type': auth.type }

  if (auth.type === 'bearer' && auth.bearerToken.trim()) {
    result['auth.bearerToken'] = auth.bearerToken.trim()
  } else if (auth.type === 'basic') {
    if (auth.basicUsername.trim()) result['auth.basicUsername'] = auth.basicUsername.trim()
    if (auth.basicPassword) result['auth.basicPassword'] = auth.basicPassword
  } else if (auth.type === 'custom-header') {
    if (auth.headerName.trim()) result['auth.headerName'] = auth.headerName.trim()
    if (auth.headerValue.trim()) result['auth.headerValue'] = auth.headerValue.trim()
  }

  return result
}

interface ConnectionAuthFieldsProps {
  auth: AuthState
  onChange: (auth: AuthState) => void
  t: (key: string) => string
  credentialBindOptions?: CredentialBindOption[]
}

export const ConnectionAuthFields: React.FC<ConnectionAuthFieldsProps> = ({
  auth,
  onChange,
  t,
  credentialBindOptions
}) => {
  const updateField = <K extends keyof AuthState>(key: K, value: AuthState[K]) => {
    onChange({ ...auth, [key]: value })
  }

  return (
    <div className="gba:space-y-3" data-testid="newwork-connect-form-auth">
      <Label>{t('connect-auth-label')}</Label>
      <Select value={auth.type} onValueChange={value => updateField('type', value as AuthType)}>
        <SelectTrigger data-testid="newwork-connect-form-auth-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('connect-auth-none')}</SelectItem>
          <SelectItem value="bearer">{t('connect-auth-bearer')}</SelectItem>
          <SelectItem value="basic">{t('connect-auth-basic')}</SelectItem>
          <SelectItem value="custom-header">{t('connect-auth-custom-header')}</SelectItem>
        </SelectContent>
      </Select>

      {auth.type === 'bearer' ? (
        <div className="gba:space-y-2">
          <Label>{t('connect-auth-bearer-token')}</Label>
          {credentialBindOptions?.length ? (
            <CredentialBindField
              value={auth.bearerToken}
              onChange={v => updateField('bearerToken', v)}
              bindOptions={credentialBindOptions}
              plainInputType="password"
              plainPlaceholder="eyJhbG..."
              data-testid="newwork-connect-form-auth-bearer-token"
            />
          ) : (
            <Input
              type="password"
              value={auth.bearerToken}
              onChange={e => updateField('bearerToken', e.target.value)}
              placeholder="eyJhbG..."
              data-testid="newwork-connect-form-auth-bearer-token"
            />
          )}
        </div>
      ) : null}

      {auth.type === 'basic' ? (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label>{t('connect-auth-username')}</Label>
            <Input
              value={auth.basicUsername}
              onChange={e => updateField('basicUsername', e.target.value)}
              data-testid="newwork-connect-form-auth-username"
            />
          </div>
          <div className="gba:space-y-2">
            <Label>{t('connect-auth-password')}</Label>
            {credentialBindOptions?.length ? (
              <CredentialBindField
                value={auth.basicPassword}
                onChange={v => updateField('basicPassword', v)}
                bindOptions={credentialBindOptions}
                plainInputType="password"
                data-testid="newwork-connect-form-auth-password"
              />
            ) : (
              <Input
                type="password"
                value={auth.basicPassword}
                onChange={e => updateField('basicPassword', e.target.value)}
                data-testid="newwork-connect-form-auth-password"
              />
            )}
          </div>
        </div>
      ) : null}

      {auth.type === 'custom-header' ? (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label>{t('connect-auth-header-name')}</Label>
            <Input
              value={auth.headerName}
              onChange={e => updateField('headerName', e.target.value)}
              placeholder="X-API-Key"
              data-testid="newwork-connect-form-auth-header-name"
            />
          </div>
          <div className="gba:space-y-2">
            <Label>{t('connect-auth-header-value')}</Label>
            {credentialBindOptions?.length ? (
              <CredentialBindField
                value={auth.headerValue}
                onChange={v => updateField('headerValue', v)}
                bindOptions={credentialBindOptions}
                plainInputType="password"
                data-testid="newwork-connect-form-auth-header-value"
              />
            ) : (
              <Input
                type="password"
                value={auth.headerValue}
                onChange={e => updateField('headerValue', e.target.value)}
                data-testid="newwork-connect-form-auth-header-value"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
