import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import UploadComponent from '../components/UploadComponent';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { ChangeEmployeeAddressProvider, useChangeEmployeeAddress } from './ChangeEmployeeAddressContext';
import { useForm } from 'react-hook-form';
import { Separator, Button, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system';
import { useFileClient } from '@/common/network/files/useFileClient';
import { env } from '@/common/env/EnvUtils';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

export interface ChangeEmployeeAddressFormProps extends BusinessAppContextProps {}

interface AddressFormValues {
  comment?: string;
  employeeDocumentId?: string;
}

const ChangeEmployeeAddressContent: React.FC<ChangeEmployeeAddressFormProps> = ({ accessToken, additionalData }) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const { data } = useChangeEmployeeAddress();

  const form = useForm<AddressFormValues>({
    defaultValues: {
      comment: '',
    },
    mode: 'onChange',
  });

  const title = useMemo(() =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.employee_tabs.flows_button.change_address',
      'Change Address'
    ),
    []
  );

  const fileClient = useFileClient({ accessToken } as any);

  const normalizedDefaults: AddressFormValues = useMemo(() => ({
    comment: '',
  }), []);

  useEffect(() => {
    form.reset(normalizedDefaults);
  }, [normalizedDefaults]);

  const initialRef = useRef<AddressFormValues>(normalizedDefaults);
  useEffect(() => {
    initialRef.current = normalizedDefaults;
  }, [normalizedDefaults]);

  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]" data-testid="change-employee-address-form-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-employee-address']]:!px-0" data-testid="change-employee-address-form-content">
        <UploadComponent
          dataTestIdPrefix="change-employee-address"
          multiple={false}
          fileList={fileList}
          setFileList={setFileList}
        />

        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          onCancel={() => {
            form.reset(normalizedDefaults);
            initialRef.current = normalizedDefaults;
          }}
          customFormLayout
          handlePreSubmit={async (values) => {
            let uploadedEmployeeDocumentId: string | undefined;
            try {
              if (fileList && fileList.length > 0 && fileList[0]?.originFileObj) {
                const file: File = fileList[0].originFileObj as File;
                const employeeId =
                  additionalData?.value?.psi_taskPayload?.employeeId ||
                  additionalData?.value?.psi_taskPayload?.initialParameters?.employeeId ||
                  undefined;

                const uploadResp = await fileClient.uploadFile(
                  file,
                  { accessScope: 'tenant' },
                  {
                    appName: 'employee-profile',
                    folderPath: `/documents/${employeeId}`,
                    mimeType: (file as any)?.type || 'application/octet-stream',
                  },
                  'fileContent'
                );

                const processesBase = env('NEXT_PUBLIC_PROCESSES_ENDPOINT') || 'https://newwork-dev.newwork.com/processes';
                const createDocUrl = `${processesBase}/employee/employeeDocuments`;
                const body = {
                  employeeDocument: {
                    employeeId: employeeId,
                    documentGroup: 'DocumentGroup:v1:PERSONAL',
                    type: 'DocumentType:v1:17',
                    description: '',
                    name: uploadResp?.fileInfo?.fileMetadata?.originalFileName,
                    file: uploadResp?.fileInfo?.fileId,
                    mimeType: uploadResp?.fileInfo?.fileMetadata?.mimeType,
                    fileSize: 0,
                    validFrom: new Date().toISOString(),
                  },
                };

                await fetch(createDocUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: accessToken ? `Bearer ${accessToken}` : '',
                  },
                  body: JSON.stringify(body),
                })
                  .then(async (r) => {
                    const json = await r.json();
                    uploadedEmployeeDocumentId = json?.employeeDocument?.id;
                  })
                  .catch(() => {
                    uploadedEmployeeDocumentId = undefined;
                  });
              }
            } catch (e) {
              uploadedEmployeeDocumentId = undefined;
            }

            return { ...(values as any), employeeDocumentId: uploadedEmployeeDocumentId } as AddressFormValues;
          }}
          onSubmit={async (values: AddressFormValues) => {
            const employeeId =
              additionalData?.value?.psi_taskPayload?.employeeId ||
              additionalData?.value?.psi_taskPayload?.initialParameters?.employeeId;

            const payload = {
              event: 'pse_submit',
              employeeDocumentObject: values.employeeDocumentId ? { id: values.employeeDocumentId } : null,
              address: {
                employeeId: employeeId,
                notes: values.comment || '',
                employeeDocument: values.employeeDocumentId ? values.employeeDocumentId : '',
              },
              changeMode: 'INSERT',
              oldAddressData: {},
            } as any;

            return payload;
          }}
          data-testid="change-employee-address"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="change-employee-address-groups">
            <FormField
              control={form.control as any}
              name={"comment" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="change-employee-address-comment-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Comment')}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} data-testid="change-employee-address-comment-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="gba:flex-grow" data-testid="change-employee-address-spacer" />

          <Separator className="gba:mt-4 gba:mb-4" data-testid="change-employee-address-divider" />

          <div className="gba:flex gba:justify-between gba:items-center gba:mt-auto gba:pt-4" data-testid="change-employee-address-actions-wrapper">
            <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-left">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  dispatchProcessContinueEvent('pse_abort', {
                    event: 'pse_abort',
                    pso_exitStrategy: 'abort',
                    pso_completeNotification: {
                      type: 'error',
                      messageKey: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_module.toast_notification_cancel_create_absence',
                        'The action has been canceled.'
                      )
                    }
                  });
                  form.reset(normalizedDefaults);
                }}
                data-testid="change-employee-address-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
              </Button>
            </div>
            <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-right">
              <Button
                type="submit"
                variant="default"
                disabled={!form.formState.isValid}
                data-testid="change-employee-address-submit-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
              </Button>
            </div>
          </div>
        </AppActionForm>
      </div>
    </div>
  );
};

export const ChangeEmployeeAddress: React.FC<ChangeEmployeeAddressFormProps> = (context) => {
  return (
    <ChangeEmployeeAddressProvider {...context}>
      <ChangeEmployeeAddressContent {...context} />
    </ChangeEmployeeAddressProvider>
  );
};

export default ChangeEmployeeAddress;


