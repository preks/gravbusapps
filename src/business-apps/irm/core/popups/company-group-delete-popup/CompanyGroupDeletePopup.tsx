import React from 'react'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanyGroup } from '@/common/data/investment/hooks/useInvestmentCompanyGroup'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface CompanyGroupDeletePopupValues {
  investmentCompanyGroupId: string
}

export interface CompanyGroupDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<CompanyGroupDeletePopupValues>
}

type CompanyGroupDeleteAdditionalData = {
  id?: string
  groupId?: string
  investmentCompanyGroupId?: string
  externalContextData?: {
    groupId?: string
    investmentCompanyGroupId?: string
  }
  psi_initialParameters?: {
    groupId?: string
    investmentCompanyGroupId?: string
  }
  psi_taskPayload?: {
    psi_initialParameters?: {
      groupId?: string
      investmentCompanyGroupId?: string
    }
  }
}

const PREFIX_DATA_TEST_ID = 'company-group-delete-popup'

const getInvestmentCompanyGroupId = (
  additionalData: CompanyGroupDeleteAdditionalData | undefined,
  initialValues: Partial<CompanyGroupDeletePopupValues>
): string =>
  additionalData?.investmentCompanyGroupId ||
  additionalData?.externalContextData?.investmentCompanyGroupId ||
  additionalData?.psi_initialParameters?.investmentCompanyGroupId ||
  additionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyGroupId ||
  additionalData?.groupId ||
  additionalData?.externalContextData?.groupId ||
  additionalData?.psi_initialParameters?.groupId ||
  additionalData?.psi_taskPayload?.psi_initialParameters?.groupId ||
  additionalData?.id ||
  initialValues.investmentCompanyGroupId ||
  ''

const CompanyGroupDeletePopup: React.FC<CompanyGroupDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const additionalData = props.additionalData as CompanyGroupDeleteAdditionalData | undefined
  const investmentCompanyGroupId = getInvestmentCompanyGroupId(additionalData, initialValues)
  const { group, loading, error } = useInvestmentCompanyGroup(props.accessToken || '', investmentCompanyGroupId)

  const handleSubmit = async () => {
    if (!group) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investmentCompanyGroup.delete.error.noData', 'Group data not loaded')
      )
    }

    return {
      investmentCompanyGroups: [
        {
          id: group.id,
          version: group.version,
          isDeleted: true
        }
      ],
      changeMode: 'DELETE'
    }
  }

  const validateForm = (): string[] | null => {
    if (!group) {
      return [getTranslationFromI18nKeyAndLabel('investmentCompanyGroup.delete.error.noData', 'Group data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('investmentCompanyGroup.delete.loading', 'Loading group...')}</p>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'error-message')}>
            {error ||
              getTranslationFromI18nKeyAndLabel('investmentCompanyGroup.delete.error.failed', 'Failed to load group')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ investmentCompanyGroupId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel(
              'investmentCompanyGroup.delete.title',
              'Delete Investment Company Group'
            )}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <WarningIcon className="gba:h-5 gba:w-5 gba:text-destructive" weight="fill" />
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">
                {getTranslationFromI18nKeyAndLabel(
                  'investmentCompanyGroup.delete.confirmation.question',
                  'Are you sure you want to delete this investment company group?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {group.name || group.id}
                  </Badge>
                </p>
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default CompanyGroupDeletePopup
export { CompanyGroupDeletePopup }
