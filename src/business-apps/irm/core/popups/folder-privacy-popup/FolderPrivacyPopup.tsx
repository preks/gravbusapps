import React, { useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { Badge, Combobox, Spinner, toast, useTranslation } from '@newwork/nw-design-system'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import translations from './_i18n'

export interface FolderPrivacyPopupProps extends BusinessAppContextProps {}

interface InvestmentDocumentPrivacyData {
  id: string
  version?: number
  name?: string
  folder?: boolean
  securityRoles?: string[]
}

const dataTestId = 'irm-folder-privacy-popup'

/**
 * IRM Folder Privacy Popup (Native Screen)
 *
 * - Reads documentId from additionalData/externalContext
 * - Loads InvestmentDocument.securityRoles via GraphQL
 * - Lets the user add/remove roles
 * - Submits a Flow-friendly payload using AppActionForm
 */
const FolderPrivacyPopup: React.FC<FolderPrivacyPopupProps> = props => {
  const graphqlClient = useGraphQLClient(props.accessToken || '')
  const rolesCtx = useMemo(() => ({ accessToken: props.accessToken || '' }), [props.accessToken])
  const rolesCatalog = useRolesCatalog(rolesCtx as any, { includeRoles: 'STANDARD' })
  const { t } = useTranslation(translations)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<InvestmentDocumentPrivacyData | null>(null)
  const [roles, setRoles] = useState<string[]>([])

  // Extract documentId from additionalData (align with IRM DocumentPopup pattern)
  const documentId = useMemo(() => {
    const ad: any = props.additionalData || {}
    const payload =
      ad?.payload || ad?.psi_taskPayload?.psi_initialParameters?.payload || ad?.psi_taskPayload?.initialParameters?.payload || {}
    const invFromAd =
      ad?.investmentDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument ||
      ad?.psi_taskPayload?.initialParameters?.investmentDocument ||
      payload?.investmentDocument

    const docId =
      ad?.documentId ||
      ad?.externalContextData?.documentId ||
      ad?.payload?.documentId ||
      ad?.psi_taskPayload?.psi_initialParameters?.documentId ||
      invFromAd?.id ||
      ''
    return String(docId || '')
  }, [props.additionalData])

  // Notify once if documentId is missing, but still render the form
  useEffect(() => {
    if (!documentId) {
      toast.error(t('irm-folder-privacy-error-no-document'))
    }
  }, [documentId])

  useEffect(() => {
    const load = async () => {
      if (!documentId) return
      try {
        setLoading(true)
        setError(null)
        const entityFields = ['account', 'contact', 'lead', 'opportunity', 'investment', 'investmentCompany']
          .map(entity => `${entity} { id }`)
          .join(' ')

        const query = `
          query GetInvestmentDocumentPrivacy($id: uuid!) {
            InvestmentDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              documentGroupRef
              documentGroup {
                id
                code
                value
              }
              documentTypeRef
              documentType {
                id
                code
                value
              }
              expirationDate
              parentDocument { id }
              folder
              fileInfo
              mimeType
              securityRoles
              ${entityFields}
            }
          }
        `
        const result = await graphqlClient.request<{ InvestmentDocument: any[] }>(query, { id: documentId })
        const node = result?.InvestmentDocument?.[0]
        if (!node) {
          setError(t('irm-folder-privacy-document-not-found'))
          setLoading(false)
          return
        }
        const current: InvestmentDocumentPrivacyData = {
          id: node.id,
          version: node.version || 0,
          name: node.name || '',
          folder: Boolean(node.folder),
          securityRoles: Array.isArray(node.securityRoles) ? node.securityRoles : []
        }
        setDoc(current)
        setRoles(current.securityRoles || [])
        setLoading(false)
      } catch (e) {
        console.error('Failed to load folder privacy:', e)
        const msg = t('irm-folder-privacy-error-load')
        setError(msg)
        // Notify but keep the form visible
        toast.error(msg)
        setLoading(false)
      }
    }
    load()
  }, [documentId, graphqlClient])

  const addRole = (role: string) => {
    const r = (role || '').trim()
    if (!r) return
    setRoles(prev => (prev.includes(r) ? prev : [...prev, r]))
  }
  const removeRole = (idx: number) => setRoles(prev => prev.filter((_, i) => i !== idx))

  const validate = () => null

  const buildPayload = () => {
    const id = doc?.id || documentId
    if (!id) return {}
    return {
      changeMode: 'UPDATE',
      investmentDocument: {
        id,
        version: doc?.version,
        securityRoles: (roles || []).map(r => ({ roleName: r }))
      }
    }
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p className="gba:mt-4">{t('irm-folder-privacy-loading')}</p>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={async () => buildPayload()}
      formData={{}}
      validateForm={validate}
      isSubmitDisabled={!documentId}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
      onSuccess={() => {
        // Close handled by host shell; nothing special needed here
      }}
      onProcessCompletion={detail => {
        if (detail?.resolution === 'failure') {
          toast.error(t('irm-folder-privacy-error-save'))
        }
      }}
      data-testid={dataTestId}
    >
      <div className="gba:space-y-6">
        {error && (
          <div className="gba:text-red-600 gba:text-sm" data-testid={`${dataTestId}-load-error`}>
            {error}
          </div>
        )}
        <div>
          <h2 className="gba:text-xl gba:font-semibold">{t('irm-folder-privacy-title')}</h2>
          <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('irm-folder-privacy-selected-folder-label')} {doc?.name || ''}
          </div>
        </div>

        <div className="gba:space-y-2">
          <div className="gba:text-sm gba:font-medium">{t('irm-folder-privacy-roles-label')}</div>
          <div className="gba:flex gba:flex-wrap gba:gap-2 gba:max-h-48 gba:overflow-y-auto gba:p-2 gba:border gba:rounded-md">
            {(roles || []).length === 0 ? (
              <span className="gba:text-xs gba:text-muted-foreground">{t('irm-folder-privacy-roles-none')}</span>
            ) : (
              (roles || []).map((val, idx) => (
                <Badge key={`${val}-${idx}`} variant="secondary" className="gba:flex gba:items-center gba:gap-1 gba:pr-1" title={val}>
                  <span>{val}</span>
                  <button
                    type="button"
                    className="gba:ml-0.5 gba:rounded gba:p-0.5 gba:hover:bg-muted gba:transition-colors"
                    aria-label="Remove role"
                    onClick={() => removeRole(idx)}
                    data-testid={`${dataTestId}-role-remove-${idx}`}
                  >
                    ×
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="gba:space-y-2">
          <div className="gba:text-sm gba:font-medium">{t('irm-folder-privacy-add-role-label')}</div>
          <div className="gba:w-full">
            {(() => {
              const selected = new Set(roles || [])
              const options = (rolesCatalog.roles || [])
                .filter((o: any) => !selected.has(o.name))
                .map((o: any) => ({ value: o.name, label: o.name }))
              return (
                <Combobox
                  value={''}
                  onValueChange={val => {
                    if (val) addRole(val)
                  }}
                  options={options}
                  placeholder={t('irm-folder-privacy-add-role-placeholder')}
                  loading={rolesCatalog.isLoading}
                  onSearch={q => rolesCatalog.onSearch(q)}
                  onLoadMore={() => rolesCatalog.loadMore()}
                  hasMore={rolesCatalog.hasMore}
                  searchDebounce={300}
                  className="gba:w-full gba:text-sm"
                  data-testid={`${dataTestId}-add-role-combobox`}
                />
              )
            })()}
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default FolderPrivacyPopup
export { FolderPrivacyPopup }
