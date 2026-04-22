import React, { useMemo } from 'react'
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form'
import { useSetupTranslation } from '../../useSetupTranslation'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { MAX_CHARACTERS_FOR_CODE, MAX_CHARACTERS_FOR_NAME } from '../../shims/ui'
import { FormFieldErrorMessage } from '../../shims/FormFieldErrorMessage'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'
import { Brain, Network } from 'lucide-react'

export interface CompanySetupStepProps<T extends FieldValues = FieldValues> {
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'CompanySetup'

type TextFieldProps<T extends FieldValues> = {
  readonly name: Path<T>
  readonly label: string
  readonly placeholder: string
  readonly maxLength: number
  readonly required?: boolean
}

function SetupTextField<T extends FieldValues>({
  name,
  label,
  placeholder,
  maxLength,
  required = false
}: TextFieldProps<T>) {
  const { clearErrors, control } = useFormContext<T>()
  const { t } = useSetupTranslation()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div>
          <label className="gba:mb-2 gba:block gba:text-sm gba:font-medium gba:text-[#111827]" htmlFor={formatDataTestId(DATA_TEST_ID_PREFIX, name)}>
            {label}
            {required ? ' *' : ''}
          </label>
          <input
            id={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
            value={(field.value as string | null | undefined) ?? ''}
            onChange={event => {
              field.onChange(event.target.value)
              clearErrors(name)
            }}
            onBlur={field.onBlur}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#94A3B8]"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
          />
          {error && (
            <FormFieldErrorMessage
              prefixDataTestId={formatDataTestId(DATA_TEST_ID_PREFIX, name)}
              message={error.message ?? t('validation-required-field')}
              extraClasses="gba:mt-1"
            />
          )}
        </div>
      )}
    />
  )
}

function CompanySetupStep<T extends FieldValues = FieldValues>({ onNext, onBack }: CompanySetupStepProps<T>) {
  const { t } = useSetupTranslation()
  const { watch } = useFormContext<T>()

  const companyCode = watch('companyCode' as Path<T>) as string | null | undefined
  const companyName = watch('companyName' as Path<T>) as string | null | undefined

  const isFormValid = useMemo(() => {
    return Boolean(companyCode?.trim() && companyName?.trim())
  }, [companyCode, companyName])

  return (
    <PlatformShellLayout
      title={t('company-setup-title')}
      description={t('company-setup-description')}
      currentStep={setupProgressStepIndex.companySetup}
      stepItems={getSetupProgressItems(t)}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={onNext}
      onBack={onBack}
      disableNext={!isFormValid}
      className="gba:w-full gba:max-w-[760px]"
    >
      <div className="gba:space-y-5">
        <div className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-white gba:p-6 gba:shadow-sm">
          <div className="gba:mb-5">
            <h2 className="gba:text-lg gba:font-semibold gba:text-[#09090B]">{t('company-setup-form-card-title')}</h2>
            <p className="gba:mt-1 gba:text-sm gba:text-[#57534E]">{t('company-setup-form-card-description')}</p>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <SetupTextField<T>
              name={'companyCode' as Path<T>}
              label={t('company-details-company-code')}
              placeholder={t('company-details-enter-company-code')}
              maxLength={MAX_CHARACTERS_FOR_CODE}
              required
            />
            <SetupTextField<T>
              name={'companyName' as Path<T>}
              label={t('company-details-company-name')}
              placeholder={t('company-details-enter-company-name')}
              maxLength={MAX_CHARACTERS_FOR_NAME}
              required
            />
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-[#F8FAFC] gba:p-5">
            <div className="gba:mb-4 gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-white gba:shadow-sm">
              <Network width={20} height={20} className="gba:text-[#2563EB]" />
            </div>
            <div className="gba:text-base gba:font-semibold gba:text-[#0F172A]">
              {t('company-setup-preset-tile-title')}
            </div>
            <p className="gba:mt-2 gba:text-sm gba:leading-6 gba:text-[#57534E]">{t('company-setup-preset-tile-description')}</p>
          </div>

          <div className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-[#FAFAF9] gba:p-5">
            <div className="gba:mb-4 gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-white gba:shadow-sm">
              <Brain width={20} height={20} className="gba:text-[#0F766E]" />
            </div>
            <div className="gba:text-base gba:font-semibold gba:text-[#0F172A]">
              {t('company-setup-placement-tile-title')}
            </div>
            <p className="gba:mt-2 gba:text-sm gba:leading-6 gba:text-[#57534E]">{t('company-setup-placement-tile-description')}</p>
          </div>
        </div>
      </div>
    </PlatformShellLayout>
  )
}

export default CompanySetupStep
