import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import UploadComponent from '../components/UploadComponent';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { ChangeEmployeeAddressProvider, useChangeEmployeeAddress } from './ChangeEmployeeAddressContext';
import { useForm } from 'react-hook-form';
import { Separator, Button, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea, Input } from '@newwork/nw-design-system';
import { useFileClient } from '@/common/network/files/useFileClient';
import { env } from '@/common/env/EnvUtils';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
// (intentionally not importing getCatalogValue here; used in subcomponents)
import AddressLines from './components/AddressLines';
import AddressSelector from './components/AddressSelector';
import CountryRegionFields from './components/CountryRegionFields';
import { ensureFourLines, buildInsertPayload, buildUpdatePayload, validateAddressForm, shouldDisableSubmit, buildDeletePayload } from './utils';

export interface ChangeEmployeeAddressFormProps extends BusinessAppContextProps {}

interface AddressFormValues {
  selectedAddressId?: string | null; // null means Add Address
  countryId?: string | null;
  addressLines: string[]; // up to 4
  postalCode?: string;
  city?: string;
  regionId?: string | null;
  regionLabel?: string; // read-only display of region label
  comment?: string;
  employeeDocumentId?: string;
}

const ChangeEmployeeAddressContent: React.FC<ChangeEmployeeAddressFormProps> = ({ accessToken, additionalData, userInfo }) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [addressLineCount, setAddressLineCount] = useState<number>(1);
  const [addressLinesError, setAddressLinesError] = useState<string | null>(null);
  const { data, refetchAddresses } = useChangeEmployeeAddress();
  const ADD_SENTINEL = '__ADD_ADDRESS__';
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const emptyAddressLines: string[] = useMemo(() => [''], []);

  const form = useForm<AddressFormValues>({
    defaultValues: {
      selectedAddressId: ADD_SENTINEL,
      countryId: undefined,
      addressLines: emptyAddressLines,
      postalCode: '',
      city: '',
      regionId: null,
      regionLabel: '',
      comment: '',
    },
    mode: 'onChange',
    shouldUnregister: true,
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
    selectedAddressId: ADD_SENTINEL,
    countryId: undefined,
    addressLines: [''],
    postalCode: '',
    city: '',
    regionId: null,
    regionLabel: '',
    comment: '',
  }), []);

  useEffect(() => {
    form.reset(normalizedDefaults);
    setAddressLineCount(1);
    setAddressLinesError(null);
  }, [normalizedDefaults]);
  // ensure submit disabled state recomputes on any value change
  const watchedValues = form.watch();

  // compute disabled state from watched values and current data
  const isSubmitDisabled = useMemo(() => {
    const addresses = (data?.address?.EmployeeAddress || []) as any[];
    return shouldDisableSubmit(watchedValues as any, addresses, { countries: data?.catalogs?.countries }, ADD_SENTINEL);
  }, [watchedValues, data?.address?.EmployeeAddress, data?.catalogs?.countries]);

  // Disable submit if an existing address is selected and no changes were made
  const isUnchangedExisting = useMemo(() => {
    const addresses = (data?.address?.EmployeeAddress || []) as any[];
    const selectedId = (watchedValues as any)?.selectedAddressId;
    const addingNew = !selectedId || selectedId === ADD_SENTINEL;
    if (addingNew) return false;
    const selected = addresses.find((a: any) => String(a.id) === String(selectedId));
    if (!selected) return false;

    const normalizeForm = (v: any) => {
      const lines = ensureFourLines(v?.addressLines || []);
      return {
        countryId: v?.countryId || null,
        addressLines: lines.map((s) => String(s || '')),
        postalCode: String(v?.postalCode || ''),
        city: String(v?.city || ''),
        regionId: v?.regionId || null,
        comment: String(v?.comment || ''),
      };
    };

    const normalizeAddress = (a: any) => {
      const lines = ensureFourLines(a?.addressLine || []);
      return {
        countryId: a?.country?.id || null,
        addressLines: lines.map((s) => String(s || '')),
        postalCode: String(a?.postalCode || ''),
        city: String(a?.locality || ''),
        regionId: a?.region?.id || null,
        comment: String(a?.comment || ''),
      };
    };

    try {
      return JSON.stringify(normalizeForm(watchedValues)) === JSON.stringify(normalizeAddress(selected));
    } catch {
      return false;
    }
  }, [watchedValues, data?.address?.EmployeeAddress]);

  // Default selection: set selected and populate fields only after catalogs are loaded
  const defaultSelectAppliedFor = useRef<string | null>(null);
  useEffect(() => {
    const addresses = (data?.address?.EmployeeAddress || []) as any[];
    const countries = (data?.catalogs?.countries || []) as any[];
    if (!countries.length) return; // wait until catalogs fetched
    const currentSelected = form.getValues('selectedAddressId');
    const key = (addresses.length > 0 ? addresses.map((a: any) => String(a.id)).join('|') : 'EMPTY') + `|countries:${countries.length}`;
    if (addresses.length > 0) {
      if ((currentSelected === undefined || currentSelected === null || currentSelected === '' || currentSelected === ADD_SENTINEL) && defaultSelectAppliedFor.current !== key) {
        const first = addresses[0];
        form.setValue('selectedAddressId', String(first.id), { shouldDirty: false, shouldValidate: false, shouldTouch: false } as any);
        form.setValue('countryId', first?.country?.id || null, { shouldDirty: false, shouldValidate: true } as any);
        const normalized = Array.from({ length: 4 }, (_, i) => String((first?.addressLine || [])[i] || ''));
        form.setValue('addressLines', normalized, { shouldDirty: false } as any);
        form.setValue('postalCode', first?.postalCode || '', { shouldDirty: false } as any);
        form.setValue('city', first?.locality || '', { shouldDirty: false } as any);
        form.setValue('regionId', first?.region?.id || null, { shouldDirty: false, shouldValidate: true } as any);
        try { (form as any).trigger && (form as any).trigger('countryId'); } catch {}
        try { (form as any).trigger && (form as any).trigger('regionId'); } catch {}
        let lastNonEmpty = -1;
        for (let i = 0; i < 4; i++) {
          if ((normalized[i] || '').trim() !== '') lastNonEmpty = i;
        }
        setAddressLineCount(Math.max(1, lastNonEmpty + 1));
        setAddressLinesError(null);
        setIsDeleteMode(false);
        defaultSelectAppliedFor.current = key;
      }
    } else {
      if (currentSelected !== ADD_SENTINEL && defaultSelectAppliedFor.current !== key) {
        form.setValue('selectedAddressId', ADD_SENTINEL, { shouldDirty: false, shouldValidate: false, shouldTouch: false } as any);
        defaultSelectAppliedFor.current = key;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address?.EmployeeAddress, data?.catalogs?.countries]);



  const initialRef = useRef<AddressFormValues>(normalizedDefaults);
  useEffect(() => {
    initialRef.current = normalizedDefaults;
  }, [normalizedDefaults]);

  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]" data-testid="change-employee-address-form-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-employee-address']]:!pt-0 gba:[&>div[data-testid='change-employee-address']]:!px-0" data-testid="change-employee-address-form-content">
        {/* moved upload below comment - removed from here */}

        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          onCancel={() => {
            if (isDeleteMode) {
              setIsDeleteMode(false);
              return;
            }
            form.reset(normalizedDefaults);
            initialRef.current = normalizedDefaults;
          }}
          customFormLayout
          validateForm={(values) => validateAddressForm(values as any, { countries: data?.catalogs?.countries })}
          handlePreSubmit={async (values) => {
            let uploadedEmployeeDocumentId: string | undefined;
            try {
              if (fileList && fileList.length > 0 && fileList[0]?.originFileObj) {
                const file: File = fileList[0].originFileObj as File;
                const employeeId =
                    userInfo?.employeeDetails?.employeeId ||
                    data?.address?.EmployeeAddress[0]?.employeeId || ""

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
            userInfo?.employeeDetails?.employeeId ||
            data?.address?.EmployeeAddress[0]?.employeeId || ""
            // ensure 4 address lines
            const lines = ensureFourLines(values.addressLines);
            const addresses = (data?.address?.EmployeeAddress || []) as any[];
            const hasPrimary = addresses.some((obj: any) => obj.type === 'PRIMARY');
            const hasSecondary = addresses.some((obj: any) => obj.type === 'SECONDARY');
            void hasPrimary; void hasSecondary;
            const addingNew = !values.selectedAddressId || values.selectedAddressId === ADD_SENTINEL;
            const selected = addingNew ? null : addresses.find((a: any) => String(a.id) === String(values.selectedAddressId));

            if (isDeleteMode && selected) {
              // DELETE mode
              return buildDeletePayload({
                employeeId,
                employeeDocumentId: values.employeeDocumentId || null,
                lines,
                postalCode: values.postalCode,
                city: values.city,
                regionId: values.regionId,
                countryId: values.countryId,
                comment: values.comment,
                selected,
              });
            }

            if (addingNew) {
              return buildInsertPayload({
                employeeId,
                employeeDocumentId: values.employeeDocumentId || null,
                lines,
                postalCode: values.postalCode,
                city: values.city,
                regionId: values.regionId,
                countryId: values.countryId,
                comment: values.comment,
                addresses,
              });
            }

            return buildUpdatePayload({
              employeeId,
              employeeDocumentId: values.employeeDocumentId || null,
              lines,
              postalCode: values.postalCode,
              city: values.city,
              regionId: values.regionId,
              countryId: values.countryId,
              comment: values.comment,
              selected,
            });
          }}
          data-testid="change-employee-address"
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="change-employee-address-groups">
            {/* Address selector (Add Address + existing addresses) */}
            {!isDeleteMode && (
              <FormField
                control={form.control as any}
                name={"selectedAddressId" as any}
                render={({ field }) => {
                  const addresses = (data?.address?.EmployeeAddress || []) as any[];
                  const selectedAddr = addresses.find((a: any) => String(a.id) === String(field.value));
                  const isSecondary = selectedAddr?.type === 'SECONDARY';
                  const linkedBank = (data?.address?.EmployeeBankAccount || []).some((b: any) => String(b.employeeAddressId) === String(selectedAddr?.id)); void linkedBank;
                  return (
                    <AddressSelector
                      value={String(field.value)}
                      onChange={(id) => {
                        field.onChange(id);
                        const picked = id === ADD_SENTINEL ? undefined : addresses.find((a: any) => String(a.id) === id);
                        if (picked) {
                          form.setValue('countryId', picked?.country?.id || null);
                          const normalized = Array.from({ length: 4 }, (_, i) => String((picked?.addressLine || [])[i] || ''));
                          form.setValue('addressLines', normalized);
                          form.setValue('postalCode', picked?.postalCode || '');
                          form.setValue('city', picked?.locality || '');
                          form.setValue('regionId', picked?.region?.id || null);
                          let lastNonEmpty = -1;
                          for (let i = 0; i < 4; i++) {
                            if ((normalized[i] || '').trim() !== '') lastNonEmpty = i;
                          }
                          setAddressLineCount(Math.max(1, lastNonEmpty + 1));
                          setAddressLinesError(null);
                          setIsDeleteMode(false);
                        } else {
                          form.reset({ ...normalizedDefaults, selectedAddressId: ADD_SENTINEL });
                          setAddressLineCount(1);
                          setAddressLinesError(null);
                          setIsDeleteMode(false);
                        }
                        refetchAddresses();
                      }}
                      addresses={addresses}
                      addSentinel={ADD_SENTINEL}
                      canShowDelete={Boolean(isSecondary && field.value !== ADD_SENTINEL)}
                      onRequestDelete={() => setIsDeleteMode(true)}
                    />
                  );
                }}
              />
            )}
            {isDeleteMode ? (
              <div className="gba:space-y-4">
                {(() => {
                  const selectedIdForDelete = form.getValues('selectedAddressId');
                  const isLinked = (data?.address?.EmployeeBankAccount || []).some((b: any) => String(b.employeeAddressId) === String(selectedIdForDelete));
                  const text = isLinked
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.linked_address_error_message','The selected address is linked to a bank account.')
                    : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.delete_confirmation_text','Are you sure you want to DELETE this address?');
                  return <span className="gba:block gba:py-2 gba:pb-10">{text}</span>;
                })()}
              </div>
            ) : (
              <>
                {/* Country */}
                <CountryRegionFields control={form.control as any} catalogs={{ countries: data?.catalogs?.countries || [], regions: data?.catalogs?.regions || [] }} setValue={form.setValue as any} />

                {/* Address Line (dynamic up to 4) */}
                <AddressLines
                  control={form.control as any}
                  addressLineCount={addressLineCount}
                  setAddressLineCount={setAddressLineCount}
                  addressLinesError={addressLinesError}
                  setAddressLinesError={setAddressLinesError}
                  getValues={form.getValues}
                />
              </>
            )}

            {!isDeleteMode && (
              <>
                {/* ZIP/Postal Code */}
                <FormField
                  control={form.control as any}
                  name={"postalCode" as any}
                  rules={{
                    validate: (v: any) => {
                      const countryIdSel = form.getValues('countryId');
                      const selectedCountry = (data?.catalogs?.countries || []).find((c: any) => String(c.id) === String(countryIdSel));
                      const countryVal = selectedCountry?.id;
                      if (!v || String(v).trim() === '') {
                        return countryVal === 'Country:v1:US'
                          ? getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.zip_code_validation_message','The ZIP Code field is required. Please enter a ZIP code.')
                          : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.postal_code_validation_message','The Postal Code field is required. Please enter a postal code.');
                      }
                      return true;
                    }
                  }}
                  render={({ field }) => {
                    const countryId = form.watch('countryId');
                    const selectedCountry = (data?.catalogs?.countries || []).find((c: any) => String(c.id) === String(countryId));
                    const isUS = selectedCountry?.id === 'Country:v1:US';
                    const label = isUS
                      ? getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.postal_code','Postal Code')
                      : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.zip_code','ZIP Code');
                    const placeholder = `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder','Please Enter')} ${label}`;
                    return (
                      <FormItem>
                        <FormLabel>{label}<span className="gba:text-destructive"> *</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={placeholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* City */}
                <FormField
                  control={form.control as any}
                  name={"city" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city_validation_message','The City field is required. Please select a city.'),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city','City')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={`${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder','Please Enter')} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city','City')}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            {/* Comment */}
                <FormField
                  control={form.control as any}
                  name={"comment" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-employee-address-comment-label">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Comment')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter')}
                          data-testid="change-employee-address-comment-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {/* Upload (compact single-line), placed under comment */}
              <UploadComponent
                dataTestIdPrefix="change-employee-address"
                multiple={false}
                fileList={fileList}
                setFileList={setFileList}
                labelText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.upload_document', 'Upload document')}
              />
              </>
            )}
          </div>

          <div className="gba:flex-grow" data-testid="change-employee-address-spacer" />

          <Separator className="gba:mt-4 gba:mb-4" data-testid="change-employee-address-divider" />

          <div className="gba:flex gba:justify-end gba:items-center gba:gap-2 gba:mt-auto gba:pt-4" data-testid="change-employee-address-actions-wrapper">
            <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-left">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if(isDeleteMode)
                  {
                    setIsDeleteMode(false)
                  }

                  else {dispatchProcessContinueEvent('pse_abort', {
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
                  form.reset(normalizedDefaults);}
                }}
                data-testid="change-employee-address-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
              </Button>
            </div>
            <div className="gba:flex gba:gap-2" data-testid="change-employee-address-actions-right">
              {isDeleteMode ? (
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={Boolean((data?.address?.EmployeeBankAccount || []).some((b: any) => String(b.employeeAddressId) === String(form.getValues('selectedAddressId'))))}
                  data-testid="change-employee-address-delete-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.delete','Delete')}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitDisabled || isUnchangedExisting}
                  data-testid="change-employee-address-submit-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
                </Button>
              )}
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


