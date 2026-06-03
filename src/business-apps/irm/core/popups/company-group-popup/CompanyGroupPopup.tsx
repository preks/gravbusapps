import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentCompanyGroup } from '@/common/data/investment/hooks/useInvestmentCompanyGroup'
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
const GROUP_UPDATED_EVENT = 'com.newwork.investmentCompanyGroup.updated'

const createCompanyGroupSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().trim().min(1, t('validation-name-required')).max(120, t('validation-name-max'))
  })

type CompanyGroupFormData = z.infer<ReturnType<typeof createCompanyGroupSchema>>
type CompanyGroupAdditionalData = {
  id?: string
  version?: number
  name?: string
  investmentCompanyGroup?: Partial<CompanyGroupFormData>
  group?: Partial<CompanyGroupFormData>
  externalContextData?: {
    id?: string
    version?: number
    name?: string
    groupId?: string
    investmentCompanyGroupId?: string
  }
  psi_initialParameters?: {
    investmentCompanyGroup?: Partial<CompanyGroupFormData>
    id?: string
    version?: number
    name?: string
    groupId?: string
    investmentCompanyGroupId?: string
  }
  psi_taskPayload?: {
    psi_initialParameters?: {
      investmentCompanyGroup?: Partial<CompanyGroupFormData>
      id?: string
      version?: number
      name?: string
      groupId?: string
      investmentCompanyGroupId?: string
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
  const externalContextData = companyGroupAdditionalData?.externalContextData
  const initialParameters =
    companyGroupAdditionalData?.psi_initialParameters ||
    companyGroupAdditionalData?.psi_taskPayload?.psi_initialParameters
  const resolvedGroupId =
    initialValues?.id ||
    companyGroupAdditionalData?.id ||
    externalContextData?.id ||
    initialParameters?.id ||
    externalContextData?.investmentCompanyGroupId ||
    initialParameters?.investmentCompanyGroupId ||
    externalContextData?.groupId ||
    initialParameters?.groupId

  const { group: fetchedGroup } = useInvestmentCompanyGroup(accessToken || '', resolvedGroupId)
  const seedGroup = companyGroupAdditionalData?.investmentCompanyGroup || companyGroupAdditionalData?.group
  const fallbackSeedId =
    companyGroupAdditionalData?.id ||
    externalContextData?.id ||
    initialParameters?.id ||
    externalContextData?.groupId ||
    initialParameters?.groupId ||
    externalContextData?.investmentCompanyGroupId ||
    initialParameters?.investmentCompanyGroupId
  const fallbackSeedVersion =
    companyGroupAdditionalData?.version || externalContextData?.version || initialParameters?.version
  const fallbackSeedName = companyGroupAdditionalData?.name || externalContextData?.name || initialParameters?.name

  const defaultValues = useMemo<CompanyGroupFormData>(
    () => ({
      id: initialValues?.id || seedGroup?.id || fallbackSeedId || fetchedGroup?.id,
      version: initialValues?.version ?? seedGroup?.version ?? fallbackSeedVersion ?? fetchedGroup?.version,
      name: initialValues?.name || seedGroup?.name || fallbackSeedName || fetchedGroup?.name || ''
    }),
    [
      fallbackSeedId,
      fallbackSeedName,
      fallbackSeedVersion,
      fetchedGroup?.id,
      fetchedGroup?.name,
      fetchedGroup?.version,
      initialValues,
      seedGroup?.id,
      seedGroup?.name,
      seedGroup?.version
    ]
  )

  const form = useForm<CompanyGroupFormData>({
    resolver: zodResolver(companyGroupSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  useEffect(() => {
    const currentName = form.getValues('name')
    const currentId = form.getValues('id')
    const currentVersion = form.getValues('version')

    const nextValues: CompanyGroupFormData = {
      id: currentId || defaultValues.id,
      version: currentVersion ?? defaultValues.version,
      name: currentName || defaultValues.name
    }

    const shouldHydrate =
      (nextValues.id && nextValues.id !== currentId) ||
      (nextValues.version !== undefined && nextValues.version !== currentVersion) ||
      (nextValues.name && nextValues.name !== currentName)

    if (shouldHydrate) {
      form.reset(nextValues, { keepDirty: true, keepTouched: true })
    }
  }, [defaultValues.id, defaultValues.name, defaultValues.version, form])

  const lastSubmittedGroupRef = useRef<{ id?: string; name?: string } | null>(null)

  const dispatchGroupUpdatedEvent = useCallback((updatedGroup: { id?: string; name?: string } | undefined) => {
    if (!updatedGroup?.id || !updatedGroup?.name) return

    const payload = {
      id: updatedGroup.id,
      investmentCompanyGroupId: updatedGroup.id,
      groupId: updatedGroup.id,
      name: updatedGroup.name
    }

    const targets: Window[] = []
    const current = globalThis.window
    if (current) {
      targets.push(current)
      try {
        const parent = current.parent && current.parent !== current ? current.parent : undefined
        const top = current.top && current.top !== current && current.top !== parent ? current.top : undefined
        if (parent) targets.push(parent)
        if (top) targets.push(top)
      } catch {
        // Ignore cross-origin access issues.
      }
    }

    const uniqueTargets = Array.from(new Set(targets))
    uniqueTargets.forEach(target =>
      target.dispatchEvent(
        new CustomEvent(GROUP_UPDATED_EVENT, {
          detail: payload
        })
      )
    )
  }, [])

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={PREFIX_DATA_TEST_ID} />
  }

  const handleSubmit = async (data: CompanyGroupFormData) => {
    lastSubmittedGroupRef.current = {
      id: data.id,
      name: data.name.trim()
    }

    const investmentCompanyGroup = buildInvestmentCompanyGroupPayload({
      id: data.id,
      version: data.version,
      name: data.name.trim()
    }).investmentCompanyGroup

    return {
      investmentCompanyGroup,
      changeMode: data.id ? 'UPDATE' : 'INSERT'
    }
  }

  return (
    <AppActionForm
      processType={defaultValues.id ? 'update' : 'create'}
      onSubmit={handleSubmit}
      onSuccess={result => {
        const updatedGroup = result?.investmentCompanyGroup || lastSubmittedGroupRef.current || undefined
        dispatchGroupUpdatedEvent(updatedGroup)
      }}
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
