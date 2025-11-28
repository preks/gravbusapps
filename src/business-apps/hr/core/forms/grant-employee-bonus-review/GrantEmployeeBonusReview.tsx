import React, { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BONUS_TYPE_CATALOG_QUERY
} from './GrantEmployeeBonusReviewQueries'
import { buildBonusDisplayItems, buildBonusDetails } from './buildRows'
import type { BonusGrantPayload, BonusDisplayItem } from './types'
import translations from '../_i18n'

/**
 * Simple display component for bonus details
 * Unlike salary adjustment, bonus granting doesn't need a comparison view
 */
const BonusDetailsList: React.FC<{
  items: BonusDisplayItem[]
  dataTestIdPrefix: string
  t: (key: string, options?: { defaultValue?: string }) => string
}> = ({ items, dataTestIdPrefix, t }) => {
  // Separate amount from other items for special display
  const amountItem = items.find(item => item.key === 'amount')
  const otherItems = items.filter(item => item.key !== 'amount')

  return (
    <div className="gba:space-y-3" data-testid={`${dataTestIdPrefix}-list`}>
      {/* Amount - Highlighted box matching salary review "Total Increase" style */}
      {amountItem && (
        <div
          className="gba:bg-card gba:text-card-foreground gba:border gba:border-foreground gba:p-3 gba:rounded-md"
          data-testid={`${dataTestIdPrefix}-${amountItem.key}`}
        >
          <div className="gba:text-sm gba:font-medium gba:mb-1">
            {t('grant-bonus-review-amount', { defaultValue: 'Amount' })}
          </div>
          <div className="gba:text-lg gba:font-semibold">{amountItem.value || '-'}</div>
        </div>
      )}

      {/* Other details - plain text style matching salary review */}
      {otherItems.map(item => (
        <div key={item.key} data-testid={`${dataTestIdPrefix}-${item.key}`}>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{item.label}</div>
          <div className="gba:font-medium">{item.value || '-'}</div>
        </div>
      ))}
    </div>
  )
}

export const GrantEmployeeBonusReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation(translations)
  const form = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const graphqlClient = useGraphQLClient(accessToken as any)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [bonusTypeEntries, setBonusTypeEntries] = useState<
    Array<{
      id: string
      code: string
      value: string
      displayOrder: number | null
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        identifier: string
        version: string
        defaultLocale: string
      }
    }>
  >([])
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data
  const payload: BonusGrantPayload = (additionalData as any)?.psi_taskPayload || {}
  const bonusData = payload?.employeeBonus || {}

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined =
    payload?.employeeId || bonusData?.employee || userInfo?.employeeDetails?.employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

  // Fetch affected employee name
  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!accessToken || !employeeIdFromPayload) return
        const result = await graphqlClient.request<{ employee: { firstName: string; lastName: string } }>(
          GET_EMPLOYEE_NAME,
          { employeeId: employeeIdFromPayload }
        )
        const emp = result?.employee
        if (emp) {
          setEmployeeName(`${emp.firstName || ''} ${emp.lastName || ''}`.trim())
        }
      } catch (error) {
        console.error('Failed to fetch employee name:', error)
      }
    }
    fetchName()
  }, [accessToken, employeeIdFromPayload, graphqlClient])

  // Fetch initiator employee name (who created the request)
  useEffect(() => {
    const fetchInitiatorName = async () => {
      try {
        if (!accessToken || !initiatorEmployeeId) return
        const result = await graphqlClient.request<{ initiator: { firstName: string; lastName: string } }>(
          GET_INITIATOR_EMPLOYEE_NAME,
          { initiatorEmployeeId }
        )
        const initiator = result?.initiator
        if (initiator) {
          setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
        }
      } catch (error) {
        console.error('Failed to fetch initiator name:', error)
      }
    }
    fetchInitiatorName()
  }, [accessToken, initiatorEmployeeId, graphqlClient])

  // Fetch bonus type catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        if (!accessToken) return
        const result = await graphqlClient.request<{
          CatalogEntry: Array<{
            id: string
            code: string
            value: string
            displayOrder: number | null
            translations: Array<{
              localeCode: string
              value: string
            }>
            catalog: {
              identifier: string
              version: string
              defaultLocale: string
            }
          }>
        }>(BONUS_TYPE_CATALOG_QUERY)
        setBonusTypeEntries(result?.CatalogEntry || [])
      } catch (error) {
        console.error('Failed to fetch bonus type catalog:', error)
      }
    }
    fetchCatalog()
  }, [accessToken, graphqlClient])

  // Build bonus display items (simple list, not comparison)
  const displayItems = useMemo(() => {
    if (!bonusData) return []
    return buildBonusDisplayItems({
      bonusData: bonusData as any,
      locale,
      bonusTypeEntries,
      t
    })
  }, [bonusData, locale, bonusTypeEntries, t])

  // Build bonus details (for description/notes)
  const bonusDetails = useMemo(() => {
    if (!bonusData) return null
    return buildBonusDetails({
      bonusData: bonusData as any,
      locale,
      bonusTypeEntries,
      t
    })
  }, [bonusData, locale, bonusTypeEntries, t])

  // Build title with employee name
  const titleText = t('grant-bonus-review-title', {
    employeeName: employeeName || '',
    defaultValue: `Employee Bonus Review for ${employeeName || ''}`
  })

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? t('grant-bonus-review-initiated-by', {
        initiatorName,
        defaultValue: `Initiated by ${initiatorName}`
      })
    : ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="review-employee-bonus-grant-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      {/* Initiator subtitle */}
      {initiatorText && (
        <div
          className="gba:px-6 gba:-mt-6 gba:mb-4 gba:text-sm gba:text-muted-foreground"
          data-testid="review-employee-bonus-grant-initiator"
        >
          {initiatorText}
        </div>
      )}

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='review-employee-bonus-grant']]:pt-0! gba:**:data-[testid='review-employee-bonus-grant-form']:max-w-none!"
        data-testid="review-employee-bonus-grant-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={{}}
          submitEventType="pse_submit"
          cancelEventType="pse_cancel"
          submitButtonText={t('grant-bonus-review-acknowledge', { defaultValue: 'Acknowledge' })}
          cancelButtonText={t('grant-bonus-review-reject', { defaultValue: 'Reject' })}
          submitButtonTestId="review-employee-bonus-grant-confirm-button"
          cancelButtonTestId="review-employee-bonus-grant-cancel-button"
          onSubmit={async () => {
            return {
              approval: 'approved'
            }
          }}
          onCancel={async () => {
            return {
              approval: 'rejected'
            }
          }}
          data-testid="review-employee-bonus-grant"
        >
          {/* Bonus Details Section */}
          <div className="gba:mb-6" data-testid="review-employee-bonus-grant-details-section">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {t('grant-bonus-review-bonus-details', { defaultValue: 'Bonus Details' })}
            </h3>
            <BonusDetailsList items={displayItems} dataTestIdPrefix="review-employee-bonus-grant" t={t} />
          </div>

          {/* Additional Information Section - Description & Notes */}
          {bonusDetails && (bonusDetails.description || bonusDetails.notes) && (
            <div className="gba:mb-4 gba:space-y-3" data-testid="grant-employee-bonus-review-info-section">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                {t('grant-bonus-review-additional-info', { defaultValue: 'Additional Information' })}
              </h3>

              {/* Description */}
              {bonusDetails.description && (
                <div data-testid="grant-employee-bonus-review-description">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                    {t('grant-bonus-review-description', { defaultValue: 'Description' })}
                  </div>
                  <div className="gba:font-medium gba:whitespace-pre-wrap">{bonusDetails.description}</div>
                </div>
              )}

              {/* Notes */}
              {bonusDetails.notes && (
                <div data-testid="grant-employee-bonus-review-notes">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                    {t('grant-bonus-review-notes', { defaultValue: 'Notes' })}
                  </div>
                  <div className="gba:font-medium gba:whitespace-pre-wrap">{bonusDetails.notes}</div>
                </div>
              )}
            </div>
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default GrantEmployeeBonusReview
