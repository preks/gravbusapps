import React, { useMemo } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { buildInvestmentCompanyGroupPayload } from '@/common/data/investment/types/investmentCompanyGroupTypes'
import translations from './_i18n'

const PREFIX_DATA_TEST_ID = 'company-group-popup'

const createCompanyGroupSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().trim().min(1, t('validation-name-required')).max(120, t('validation-name-max'))
  })

type CompanyGroupFormData = z.infer<ReturnType<typeof createCompanyGroupSchema>>
type CompanyGroupAdditionalData = {
  investmentCompanyGroup?: Partial<CompanyGroupFormData>
  group?: Partial<CompanyGroupFormData>
  psi_taskPayload?: {
    psi_initialParameters?: {
      investmentCompanyGroup?: Partial<CompanyGroupFormData>
    }
  }
}

export interface CompanyGroupPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<CompanyGroupFormData>
}

const CompanyGroupPopup: React.FC<CompanyGroupPopupProps> = ({ initialValues, ...context }) => {
  const { t } = useTranslation(translations)
  const companyGroupSchema = useMemo(() => createCompanyGroupSchema(t), [t])
  const { accessToken, additionalData } = context
  const companyGroupAdditionalData: CompanyGroupAdditionalData | undefined = additionalData
  const seedGroup =
    companyGroupAdditionalData?.investmentCompanyGroup ||
    companyGroupAdditionalData?.group ||
    companyGroupAdditionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyGroup

  const defaultValues = useMemo<CompanyGroupFormData>(
    () => ({
      id: initialValues?.id || seedGroup?.id,
      version: initialValues?.version ?? seedGroup?.version,
      name: initialValues?.name || seedGroup?.name || ''
    }),
    [initialValues, seedGroup]
  )

  const form = useForm<CompanyGroupFormData>({
    resolver: zodResolver(companyGroupSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={PREFIX_DATA_TEST_ID} />
  }

  const handleSubmit = async (data: CompanyGroupFormData) => {
    const investmentCompanyGroup = buildInvestmentCompanyGroupPayload({
      id: data.id,
      version: data.version,
      name: data.name.trim()
    }).investmentCompanyGroup

    return {
      investmentCompanyGroups: [investmentCompanyGroup],
      changeMode: data.id ? 'UPDATE' : 'INSERT'
    }
  }

  return (
    <AppActionForm
      processType={defaultValues.id ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={form.getValues()}
      form={form}
      schema={companyGroupSchema}
      submitButtonText={defaultValues.id ? t('update-button') : t('create-button')}
      data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'Form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'Container')}>
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name-label')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('name-placeholder')}
                  data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'Name')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  )
}

export default CompanyGroupPopup
export { CompanyGroupPopup }
