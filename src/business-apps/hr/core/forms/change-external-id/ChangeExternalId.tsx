import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY } from './ChangeExternalIdQueries'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useForm } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Spinner } from '@newwork/nw-design-system'

interface ExternalIdFormValues {
  externalId: string
}

export const ChangeExternalId: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData, userInfo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [isLoading, setIsLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [employeePosition, setEmployeePosition] = useState<any>(null)
  const ignorePrefillAfterSubmitRef = useRef(false)

  const form = useForm<ExternalIdFormValues>({
    defaultValues: {
      externalId: ''
    },
    mode: 'onChange'
  })

  // Prefill
  useEffect(() => {
    const fetchEmployee = async () => {
      // After submit, emulate no reload by skipping any prefill fetch/reset
      if (ignorePrefillAfterSubmitRef.current) {
        return
      }
      try {
        setIsLoading(true)
        const employeeId =
          additionalData?.employeeId ||
          additionalData?.psi_taskPayload?.employeeId ||
          additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
          userInfo?.employeeDetails?.employeeId ||
          ''
        if (employeeId) {
          const res = await graphqlClient.request<any>(EMPLOYEE_DATA_QUERY, { idEmployee: employeeId })
          const emp = res?.EmployeeByPk || null
          setEmployee(emp)
          setEmployeePosition(res?.EmployeePosition?.[0] || null)
          if (!ignorePrefillAfterSubmitRef.current) {
            form.reset({
              externalId: emp?.externalId || emp?.additionalProperties?.SAPNumber || ''
            })
            initialRef.current = { externalId: emp?.externalId || emp?.additionalProperties?.SAPNumber || '' }
          }
        } else {
          setEmployee(null)
          if (!ignorePrefillAfterSubmitRef.current) {
            form.reset({ externalId: '' })
            initialRef.current = { externalId: '' }
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchEmployee()
  }, [additionalData, userInfo, graphqlClient, form])

  // Track initial values for unchanged-state
  const initialRef = useRef<ExternalIdFormValues>(form.getValues())
  const watched = form.watch()
  const isUnchanged = useMemo(() => {
    const norm = (v: ExternalIdFormValues) => ({ externalId: String(v.externalId || '') })
    return JSON.stringify(norm(watched as any)) === JSON.stringify(norm(initialRef.current))
  }, [watched])

  const hasValidationErrors = Object.keys((form.formState as any)?.errors ?? {}).length > 0
  const isSubmitDisabled = useMemo(() => hasValidationErrors || isUnchanged, [hasValidationErrors, isUnchanged])

  if (isLoading) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[600px]"
        data-testid="change-external-id-form-container"
      >
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel(
            'lowcoder:change_external_id.change_external_id_title',
            'Change SAP Number'
          )}
          flowIconUrl={flowIconUrl}
          className="gba:px-6"
        />
        <div
          className="gba:flex gba:items-center gba:justify-center gba:py-20"
          data-testid="change-external-id-loading"
        >
          <Spinner size="xl" srText={getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.loading', 'Loading')} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[600px]"
      data-testid="change-external-id-form-container"
    >
      <FormHeader
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:change_external_id.change_external_id_title',
          'Change SAP Number'
        )}
        flowIconUrl={flowIconUrl}
        className="gba:px-6"
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: employeePosition?.jobPosition?.name
              }
            : undefined
        }
      />

      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-external-id']]:!pt-0">
        <AppActionForm
          processType="update"
          form={form as any}
          formData={initialRef.current}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          submitButtonTestId="flw_changeExternalId_submitButton"
          cancelButtonTestId="flw_changeExternalId_cancelButton"
          onSubmit={async (values: ExternalIdFormValues) => {
            // Prevent prefill reset while the process is completing and the modal is about to close
            ignorePrefillAfterSubmitRef.current = true
            const employeeId =
              additionalData?.employeeId ||
              additionalData?.psi_taskPayload?.employeeId ||
              additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
              userInfo?.employeeDetails?.employeeId ||
              employee?.id ||
              ''

            const payload = {
              event: 'pse_submit',
              employeeId,
              changeMode: 'UPDATE',
              employee: {
                id: employeeId,
                ...(employee?.version !== undefined ? { version: employee?.version } : {}),
                externalId: values.externalId || ''
              },
              oldEmployee: {
                id: employeeId,
                ...(employee?.version !== undefined ? { version: employee?.version } : {}),
                externalId: employee?.externalId || ''
              }
            }
            return payload as any
          }}
          data-testid="change-external-id"
        >
          <div className="gba:flex-1 gba:space-y-4">
            <FormField
              control={form.control as any}
              name={'externalId' as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:change_external_id.external_id_required',
                  'The SAP Number field is required.'
                ) as unknown as string
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="change-external-id-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:change_external_id.external_id_label', 'SAP Number')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
                        'Please Enter'
                      )}
                      data-testid="flw_changeExternalId_externalId"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeExternalId
