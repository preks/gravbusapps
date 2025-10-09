import React, { useEffect, useMemo, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { useForm } from 'react-hook-form';
import { Separator, Button, FormField, FormItem, FormLabel, FormControl, FormMessage, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, Alert, Textarea } from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { ChangeBankAccountProvider, useChangeBankAccount } from './ChangeBankAccountContext';

export interface ChangeBankAccountFormProps extends BusinessAppContextProps {}

interface BankAccountFormValues {
  countryId?: string | null;
  currencyId?: string | null;
  bankName?: string;
  accountType?: 'CHECKINGS' | 'SAVINGS' | '';
  accountHolder?: string;
  // Non-US fields
  iban?: string;
  swift?: string;
  // US-specific fields
  routingNumberTypeId?: string | null;
  accountNumber?: string;
  routingNumber?: string;
  employeeAddressId?: string | null;
  // Common
  comment?: string;
}

const ChangeBankAccountContent: React.FC<ChangeBankAccountFormProps> = () => {
  const { data } = useChangeBankAccount();

  const form = useForm<BankAccountFormValues>({
    defaultValues: {
      countryId: null,
      currencyId: null,
      bankName: '',
      accountType: '' as any,
      accountHolder: '',
      iban: '',
      swift: '',
      routingNumberTypeId: null,
      accountNumber: '',
      routingNumber: '',
      employeeAddressId: null,
      comment: '',
    },
    mode: 'onChange',
    shouldUnregister: true,
  });

  const title = useMemo(() =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.employee_tabs.flows_button.change_bank_account',
      'Change Bank Account'
    ),
    []
  );

  const normalizedDefaults: BankAccountFormValues = useMemo(() => ({
    countryId: null,
    currencyId: null,
    bankName: '',
    accountType: '' as any,
    accountHolder: '',
    iban: '',
    swift: '',
    routingNumberTypeId: null,
    accountNumber: '',
    routingNumber: '',
    employeeAddressId: null,
    comment: '',
  }), []);

  const catalogCountries = (data?.catalogs?.countries || []) as any[];
  const catalogCurrencies = (data?.catalogs?.currency || []) as any[];
  const catalogRoutingTypes = (data?.catalogs?.routingNumber || []) as any[];
  const employeeAddresses = (data?.employee?.EmployeeAddress || []) as any[];

  const selectedCountryId = form.watch('countryId');
  const isUSAndNoAddress = selectedCountryId === 'Country:v1:US' && employeeAddresses.length === 0;
  const isUS = selectedCountryId === 'Country:v1:US';
  const selectedEmployeeAddressId = form.watch('employeeAddressId');
  const selectedEmployeeAddress = employeeAddresses.find((a: any) => String(a.id) === String(selectedEmployeeAddressId));

  const existingAccount = useMemo(() => {
    const list = (data?.employee?.EmployeeBankAccount || []) as any[];
    return list[0] || null;
  }, [data?.employee?.EmployeeBankAccount]);

  const primaryAddress = useMemo(() => {
    if (!employeeAddresses?.length) return null as any;
    return employeeAddresses.find((a: any) => a?.type === 'PRIMARY') || employeeAddresses[0] || null;
  }, [employeeAddresses]);

  // Apply initial preselects once when data is ready
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    if (!catalogCountries?.length) return;

    const employee = (data?.employee as any)?.Employee?.[0] || {};
    const countryIdPreset: string | null = existingAccount?.country?.id || primaryAddress?.country?.id || null;
    let currencyIdPreset: string | null = existingAccount?.currency?.id || null;
    if (!currencyIdPreset && countryIdPreset) {
      const country = catalogCountries.find((c: any) => String(c.id) === String(countryIdPreset));
      const obj = country?.objectValue;
      try {
        const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
        const cur = parsed?.currency as string | undefined;
        if (cur) currencyIdPreset = cur;
      } catch {}
    }

    const presetValues = {
      countryId: countryIdPreset,
      currencyId: currencyIdPreset ?? null,
      bankName: existingAccount?.bankName || '',
      accountType: (existingAccount?.accountType || 'CHECKINGS') as any,
      accountHolder: (existingAccount?.accountHolder || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim()),
      iban: existingAccount?.iban || '',
      swift: existingAccount?.swift || '',
      routingNumberTypeId: existingAccount?.routingNumberType || null,
      accountNumber: existingAccount?.accountNumber || '',
      routingNumber: existingAccount?.routingNumber || '',
      employeeAddressId: existingAccount?.employeeAddressId || primaryAddress?.id || null,
      comment: existingAccount?.notes || '',
    } as any;

    form.reset(presetValues);
    defaultsAppliedRef.current = true;
  }, [catalogCountries, existingAccount, primaryAddress, data?.employee, form]);

  // When country changes, preselect currency from country.objectValue only if user hasn't touched currency yet
  useEffect(() => {
    if (!selectedCountryId) return;
    const dirtyCurrency = Boolean((form.formState as any)?.dirtyFields?.currencyId);
    if (dirtyCurrency) return;
    const country = catalogCountries.find((c: any) => String(c.id) === String(selectedCountryId));
    const obj = country?.objectValue;
    try {
      const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
      const cur = parsed?.currency as string | undefined;
      if (cur) {
        form.setValue('currencyId', cur as any, { shouldDirty: false, shouldValidate: true } as any);
      }
    } catch {}
  }, [selectedCountryId, catalogCountries, form]);

  // Compute unchanged state vs existing account with debug logs
  const watchedValues = form.watch();
  const isUnchangedExisting = useMemo(() => {
    const acc = existingAccount;
    if (!acc) return false;
    try {
      const v = form.getValues() as any;
      const normalize = (x: any) => ({
        countryId: x?.countryId || null,
        currencyId: x?.currencyId || null,
        bankName: String(x?.bankName || ''),
        accountType: String(x?.accountType || ''),
        accountHolder: String(x?.accountHolder || ''),
        iban: String(x?.iban || ''),
        swift: String(x?.swift || ''),
        routingNumberTypeId: x?.routingNumberTypeId || null,
        accountNumber: String(x?.accountNumber || ''),
        routingNumber: String(x?.routingNumber || ''),
        employeeAddressId: x?.employeeAddressId || null,
        comment: String(x?.comment || ''),
      });
      const normalizeAcc = (a: any) => ({
        countryId: a?.country?.id || null,
        currencyId: a?.currency?.id || null,
        bankName: String(a?.bankName || ''),
        accountType: String(a?.accountType || ''),
        accountHolder: String(a?.accountHolder || ''),
        iban: String(a?.iban || ''),
        swift: String(a?.swift || ''),
        routingNumberTypeId: a?.routingNumberType || null,
        accountNumber: String(a?.accountNumber || ''),
        routingNumber: String(a?.routingNumber || ''),
        employeeAddressId: a?.employeeAddressId || null,
        comment: String(a?.notes || ''),
      });
      const current = normalize(v);
      const existing = normalizeAcc(acc);
      const equal = JSON.stringify(current) === JSON.stringify(existing);
      return equal;
    } catch {
      return false;
    }
  }, [existingAccount, watchedValues, form]);

  // Combine disabled states for explicit button control
  const hasValidationErrors = useMemo(() => Boolean(form.formState?.errors && Object.keys(form.formState.errors).length > 0), [form.formState?.errors]);
  const isSubmitDisabledFinal = useMemo(() => {
    const disabled = isUSAndNoAddress || hasValidationErrors || isUnchangedExisting;
    return disabled;
  }, [isUSAndNoAddress, hasValidationErrors, isUnchangedExisting]);

  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]" data-testid="change-bank-account-form-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-bank-account']]:!p-0" data-testid="change-bank-account-form-content">
        <AppActionForm
          processType="update"
          form={form as any}
          formData={normalizedDefaults}
          submitEventType="pse_submit"
          isSubmitDisabled={
            // Disable if US without addresses
            isUSAndNoAddress ||
            // Disable if there are validation errors
            Boolean(form.formState?.errors && Object.keys(form.formState.errors).length > 0) ||
            // Disable if unchanged compared to existing account (when account exists)
            isUnchangedExisting
          }
          onCancel={() => {
            dispatchProcessContinueEvent('pse_abort', {
              event: 'pse_abort',
              pso_exitStrategy: 'abort',
              pso_completeNotification: {
                type: 'error',
                messageKey: getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.toast_notification_cancel_create_absence', 'The action has been canceled.')
              }
            });
            form.reset(normalizedDefaults);
          }}
          customFormLayout
          onSubmit={async (values: BankAccountFormValues) => {
            return values as any;
          }}
          data-testid="change-bank-account"
        >
          <div className="gba:flex-1 gba:space-y-4">
            <FormField
              control={form.control as any}
              name={"countryId" as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.country_select_error_message',
                  'The Country field is required.'
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.country_select_label', 'Country')}<span className="gba:text-destructive"> *</span>
                  </FormLabel>
                  <Select
                    value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="flw_changeBankAccount_country">
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.country_select_placeholder', 'Select Country')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogCountries.map((entry: any) => (
                        <SelectItem key={entry.id} value={String(entry.id)} data-testid={`flw_changeBankAccount_countryOption-${entry.id}`}>
                          {getCatalogValue(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {isUSAndNoAddress ? (
                    <Alert
                      variant="destructive"
                      className="gba:mt-2 gba:w-full gba:break-words gba:whitespace-nowrap"
                      data-testid="flw_changeBankAccount_country_us_alert"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.bank_account_form.country_select_usa_alert',
                        'Please add an address to your profile first.'
                      )}
                    </Alert>
                  ) : null}
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name={"currencyId" as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_error_message',
                  'The Currency field is required.'
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.currency_select_label', 'Currency')}<span className="gba:text-destructive"> *</span>
                  </FormLabel>
                  <Select
                    value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="flw_changeBankAccount_currency">
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.currency_select_placeholder', 'Select Currency')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogCurrencies.map((entry: any) => (
                        <SelectItem key={entry.id} value={String(entry.id)} data-testid={`flw_changeBankAccount_currencyOption-${entry.id}`}>
                          {entry.code || getCatalogValue(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name={"bankName" as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_error_message',
                  'The Bank Name field is required.'
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_label', 'Bank Name')}<span className="gba:text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_placeholder', 'Enter Bank Name')} data-testid="flw_changeBankAccount_bankName" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name={"accountType" as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_error_message',
                  'The Account Type field is required.'
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_label', 'Account Type')}<span className="gba:text-destructive"> *</span>
                  </FormLabel>
                  <Select
                    value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                    onValueChange={(v) => field.onChange(v || '')}
                  >
                    <FormControl>
                      <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="flw_changeBankAccount_accountType">
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_placeholder', 'Select Account Type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CHECKINGS" data-testid="flw_changeBankAccount_accountTypeOption-CHECKINGS">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_checkings_value', 'Checkings')}
                      </SelectItem>
                      <SelectItem value="SAVINGS" data-testid="flw_changeBankAccount_accountTypeOption-SAVINGS">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_savings_value', 'Savings')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name={"accountHolder" as any}
              rules={{
                required: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_error_message',
                  'The Account Holder field is required.'
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_label', 'Account Holder')}<span className="gba:text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_placeholder', 'Enter Account Holder')} data-testid="flw_changeBankAccount_accountHolder" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUS ? (
              <>
                <FormField
                  control={form.control as any}
                  name={"routingNumberTypeId" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_error_message',
                      'The Routing Number Type field is required.'
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label', 'Routing Number Type')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <Select
                        value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="flw_changeBankAccount_routingNumberType">
                            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_placeholder', 'Select Routing Number Type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {catalogRoutingTypes.map((entry: any) => (
                            <SelectItem key={entry.id} value={String(entry.id)} data-testid={`flw_changeBankAccount_routingNumberTypeOption-${entry.id}`}>
                              {getCatalogValue(entry)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name={"accountNumber" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_error_message',
                      'The Account Number field is required.'
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label', 'Account Number')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_placeholder', 'Enter Account Number')} data-testid="flw_changeBankAccount_accountNumber" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name={"routingNumber" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_error_message',
                      'The Routing Number field is required.'
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label', 'Routing Number')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_placeholder', 'Enter Routing Number')} data-testid="flw_changeBankAccount_routingNumber" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name={"employeeAddressId" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.address_select_error_message',
                      'The Address field is required.'
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.address_select_label', 'Address')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <Select
                        value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="flw_changeBankAccount_address">
                            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.address_select_placeholder', 'Select Address')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeeAddresses.map((entry: any) => (
                            <SelectItem key={entry.id} value={String(entry.id)} data-testid={`flw_changeBankAccount_addressOption-${entry.id}`}>
                              {entry?.type || ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <div className="gba:mt-2 gba:w-full gba:min-h-10 gba:px-3 gba:py-2 gba:rounded-md gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted gba:whitespace-pre-wrap" data-testid="flw_changeBankAccount_selectedAddressDisplay">
                        {selectedEmployeeAddress ? (
                          (() => {
                            const line1 = `${String(selectedEmployeeAddress?.addressLine?.[0] || '')} ${String(selectedEmployeeAddress?.addressLine?.[1] || '')}`.trim();
                            const line2 = `${String(selectedEmployeeAddress?.addressLine?.[2] || '')} ${String(selectedEmployeeAddress?.addressLine?.[3] || '')}`.trim();
                            const line3 = `${String(selectedEmployeeAddress?.region?.alternativeCode || '')} ${String(selectedEmployeeAddress?.locality || '')} ${String(selectedEmployeeAddress?.postalCode || '')}`.trim();
                            return (
                              <>
                                {line1}
                                {line2 ? (<><br />{line2}</>) : null}
                                <br />
                                {line3}
                              </>
                            );
                          })()
                        ) : (
                          getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.no_selected_address_text', 'No selected address')
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control as any}
                  name={"iban" as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_error_message',
                      'The IBAN field is required.'
                    ),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label', 'IBAN')}<span className="gba:text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.iban_select_placeholder', 'Enter IBAN')} data-testid="flw_changeBankAccount_iban" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name={"swift" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.swift_select_label', 'Swift')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.bank_account_form.swift_select_placeholder', 'Enter Swift')} data-testid="flw_changeBankAccount_swift" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control as any}
              name={"comment" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="change-bank-account-comment-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Comment')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter')}
                      data-testid="flw_changeBankAccount_comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="gba:flex-grow" data-testid="change-bank-account-spacer" />

          <Separator className="gba:mt-4 gba:mb-4" data-testid="change-bank-account-divider" />

          <div className="gba:flex gba:justify-end gba:items-center gba:gap-2 gba:mt-auto gba:pt-4" data-testid="change-bank-account-actions-wrapper">
            <div className="gba:flex gba:gap-2" data-testid="change-bank-account-actions-left">
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
                        'lowcoder:create_expense_request.initiate_cancel_button',
                        'Cancel'
                      )
                    }
                  });
                  form.reset(normalizedDefaults);
                }}
                data-testid={'flw_changeBankAccount_cancelButton'}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
              </Button>
            </div>
            <div className="gba:flex gba:gap-2" data-testid="change-bank-account-actions-right">
              <Button
                type="submit"
                variant="default"
                data-testid="flw_changeBankAccount_submitButton"
                disabled={isSubmitDisabledFinal}
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

export const ChangeBankAccount: React.FC<ChangeBankAccountFormProps> = (context) => {
  return (
    <ChangeBankAccountProvider {...context}>
      <ChangeBankAccountContent {...context} />
    </ChangeBankAccountProvider>
  );
};

export default ChangeBankAccount;


