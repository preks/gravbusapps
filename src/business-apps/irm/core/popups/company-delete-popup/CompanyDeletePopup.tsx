import React from 'react'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface CompanyDeletePopupValues {
  investmentCompanyId: string
}

export interface CompanyDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<CompanyDeletePopupValues>
}

type CompanyDeleteAdditionalData = {
  id?: string
  investmentCompanyId?: string
  externalContextData?: {
    investmentCompanyId?: string
  }
  psi_initialParameters?: {
    investmentCompanyId?: string
  }
  psi_taskPayload?: {
    psi_initialParameters?: {
      investmentCompanyId?: string
    }
  }
}

const PREFIX_DATA_TEST_ID = 'company-delete-popup'

const getInvestmentCompanyId = (
  additionalData: CompanyDeleteAdditionalData | undefined,
  initialValues: Partial<CompanyDeletePopupValues>
): string =>
  additionalData?.investmentCompanyId ||
  additionalData?.externalContextData?.investmentCompanyId ||
  additionalData?.psi_initialParameters?.investmentCompanyId ||
  additionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyId ||
  additionalData?.id ||
  initialValues.investmentCompanyId ||
  ''

const CompanyDeletePopup: React.FC<CompanyDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const additionalData = props.additionalData as CompanyDeleteAdditionalData | undefined
  const investmentCompanyId = getInvestmentCompanyId(additionalData, initialValues)
  const { company, loading, error } = useInvestmentCompany(props.accessToken || '', investmentCompanyId)

  const handleSubmit = async () => {
    if (!company) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investmentCompany.delete.error.noData', 'Company data not loaded')
      )
    }

    return {
      investmentCompany: {
        id: company.id,
        version: company.version,
        isDeleted: true
      },
      changeMode: 'DELETE'
    }
  }

  const validateForm = (): string[] | null => {
    if (!company) {
      return [getTranslationFromI18nKeyAndLabel('investmentCompany.delete.error.noData', 'Company data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('investmentCompany.delete.loading', 'Loading company...')}</p>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'error-message')}>
            {error ||
              getTranslationFromI18nKeyAndLabel('investmentCompany.delete.error.failed', 'Failed to load company')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ investmentCompanyId }}
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
            {getTranslationFromI18nKeyAndLabel('investmentCompany.delete.title', 'Delete Investment Company')}
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
                  'investmentCompany.delete.confirmation.question',
                  'Are you sure you want to delete this investment company?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {company.name || company.code || company.id}
                  </Badge>
                </p>
                {company.code && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.code', 'Code')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {company.code}
                    </Badge>
                  </p>
                )}
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

export default CompanyDeletePopup
export { CompanyDeletePopup }
