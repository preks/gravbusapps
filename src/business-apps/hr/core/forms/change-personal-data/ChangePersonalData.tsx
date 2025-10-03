import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel, formatDateToISO } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import UploadComponent from '../components/UploadComponent';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { ChangePersonalDataProvider, useChangePersonalData } from './ChangePersonalDataContext';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Separator,
} from '@newwork/nw-design-system';
import NamesGroup from './components/NamesGroup';
import BirthAndGenderGroup from './components/BirthAndGenderGroup';
import NationalityLanguageStatusGroup from './components/NationalityLanguageStatusGroup';
import QualificationFields from './components/QualificationFields';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useFileClient } from '@/common/network/files/useFileClient';
import { env } from '@/common/env/EnvUtils';
 

export interface ChangePersonalDataFormProps extends BusinessAppContextProps {}

type PersonalDataFormValues = {
  salutationRef: string | null;
  title: string;
  firstName: string;
  lastName: string;
  displayName: string;
  preferredName: string;
  birthName: string;
  birthDate: string; // YYYY-MM-DD
  // Additional fields
  birthPlace?: string;
  genderRef?: string | null;
  nationalityRef?: string | null;
  languageRef?: string | null;
  maritalStatusRef?: string | null;
  severelyDisabilityDegree?: string | number;
  schoolQualificationRef?: string | null;
  academicTitleRefs?: string[];
  comment?: string;
};

const ChangePersonalDataContent: React.FC<ChangePersonalDataFormProps> = ({ accessToken, additionalData }) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const { data } = useChangePersonalData();

  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data]);
  const catalogSalutation: any[] = useMemo(() => data?.catalogs?.salutation || [], [data]);
  const catalogs = useMemo(() => ({
    gender: data?.catalogs?.gender || [],
    nationality: data?.catalogs?.nationality || [],
    language: data?.catalogs?.language || [],
    maritalStatus: data?.catalogs?.maritalStatus || [],
    schoolQualification: data?.catalogs?.schoolQualification || [],
    academicTitle: data?.catalogs?.academicTitle || [],
  }), [data]);

  const normalizeDate = (value?: string | null): string => {
    if (!value) return '';
    // Expect incoming values like 'YYYY-MM-DD' or ISO strings
    return String(value).slice(0, 10);
  };

  const computeDisplayName = (emp: any): string => {
    const hasDisplay = emp?.displayName && String(emp.displayName).trim().length > 0;
    if (hasDisplay) return String(emp.displayName).trim();
    const title = (emp?.title || '').toString().trim();
    const first = (emp?.firstName || '').toString().trim();
    const last = (emp?.lastName || '').toString().trim();
    const fullWithTitle = [title, first, last].filter(Boolean).join(' ').trim();
    if (fullWithTitle.length > 0) return fullWithTitle;
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full;
  };

  const defaultValues: PersonalDataFormValues = useMemo(() => ({
    salutationRef: employee?.salutationRef ?? null,
    title: employee?.title ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    // Note: Labels requested are intentionally swapped by specification
    displayName: computeDisplayName(employee) ?? '',
    preferredName: employee?.preferredName ?? '',
    birthName: employee?.birthName ?? '',
    birthDate: normalizeDate(employee?.birthDate ?? ''),
    birthPlace: employee?.birthPlace ?? '',
    genderRef: employee?.genderRef ?? null,
    nationalityRef: employee?.nationalityRef ?? null,
    languageRef: employee?.languageRef ?? null,
    maritalStatusRef: employee?.maritalStatusRef ?? null,
    severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? '',
    schoolQualificationRef: employee?.schoolQualificationRef ?? null,
    academicTitleRefs: Array.isArray(employee?.academicTitleRef) ? employee.academicTitleRef : (employee?.academicTitleRef ? [employee.academicTitleRef] : []),
    comment: employee?.notes ?? '',
  }), [employee]);

  const form = useForm<PersonalDataFormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const fileClient = useFileClient({ accessToken } as any);

  // Reset to defaults whenever employee/catalogs change
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues]);

  // Track initial values for change detection
  const initialRef = useRef<PersonalDataFormValues>(defaultValues);
  useEffect(() => {
    initialRef.current = defaultValues;
  }, [defaultValues]);

  const normalizeForCompare = (v: PersonalDataFormValues) => ({
    salutationRef: v.salutationRef || null,
    title: v.title || '',
    firstName: v.firstName || '',
    lastName: v.lastName || '',
    displayName: v.displayName || '',
    preferredName: v.preferredName || '',
    birthName: v.birthName || '',
    birthDate: v.birthDate || '',
    birthPlace: v.birthPlace || '',
    genderRef: v.genderRef || null,
    nationalityRef: v.nationalityRef || null,
    languageRef: v.languageRef || null,
    maritalStatusRef: v.maritalStatusRef || null,
    severelyDisabilityDegree: v.severelyDisabilityDegree === '' ? '' : v.severelyDisabilityDegree,
    schoolQualificationRef: v.schoolQualificationRef || null,
    academicTitleRefs: Array.isArray(v.academicTitleRefs) ? v.academicTitleRefs : [],
    comment: v.comment || '',
  });

  const watchedValues = form.watch();
  const isUnchanged = useMemo(() => {
    const current = normalizeForCompare(watchedValues as PersonalDataFormValues);
    const initial = normalizeForCompare(initialRef.current);
    return JSON.stringify(current) === JSON.stringify(initial);
  }, [watchedValues]);

  

  // validation moved into group components

  const title = useMemo(() =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.employee_tabs.flows_button.change_personal_data',
      'Change Personal Data'
    ),
    []
  );


  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col" style={{ width: '100%', maxWidth: '800px' }} data-testid="change-personal-data-form-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4" data-testid="change-personal-data-form-content">
        <UploadComponent
          dataTestIdPrefix="change-personal-data"
          multiple={false}
          fileList={fileList}
          setFileList={setFileList}
        />

        <Form {...form}>
          <form
            className="gba:space-y-4"
            data-testid="change-personal-data-form-fields"
            onSubmit={form.handleSubmit(async (values) => {
              let uploadedEmployeeDocumentId: string | undefined;

              // If a file is attached, upload to file service, then create employee document
              try {
                if (fileList && fileList.length > 0 && fileList[0]?.originFileObj) {
                  const file: File = fileList[0].originFileObj as File;
                  const employeeId =
                    additionalData?.value?.psi_taskPayload?.employeeId ||
                    additionalData?.value?.psi_taskPayload?.initialParameters?.employeeId ||
                    data?.employee?.EmployeeByPk?.id ||
                    data?.employee?.EmployeeByPk?.employeeId;

                  // Upload to /tenant/files with params
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

                  // Create employee document in processes API
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
                // Soft-fail: continue submit without employee document
                uploadedEmployeeDocumentId = undefined;
              }

              const payload = {
                event: 'pse_submit',
                employeeDocument: uploadedEmployeeDocumentId || '',
                personalInformation: {
                  id: employee?.id || '',
                  notes: values.comment || '',
                  title: values.title || '',
                  personalDocument: uploadedEmployeeDocumentId || '',
                  version: employee?.version ?? 0,
                  academicTitleRef: values.academicTitleRefs || [],
                  salutationRef: values.salutationRef || '',
                  firstName: values.firstName || '',
                  lastName: values.lastName || '',
                  preferredName: values.preferredName || '',
                  displayName: values.displayName || '',
                  birthName: values.birthName || '',
                  birthDate: values.birthDate ? formatDateToISO(new Date(values.birthDate)) : '',
                  genderRef: values.genderRef || '',
                  nationalityRef: values.nationalityRef || '',
                  languageRef: values.languageRef || '',
                  maritalStatusRef: values.maritalStatusRef || '',
                  severelyDisabilityDegree: values.severelyDisabilityDegree !== '' ? values.severelyDisabilityDegree : 0,
                  schoolQualificationRef: values.schoolQualificationRef || '',
                  birthPlace: values.birthPlace || '',
                  userId: employee?.userId || '',
                },
                oldPersonalInformation: {
                  id: employee?.id || '',
                  version: employee?.version ?? 0,
                  academicTitleRef: employee?.academicTitleRef || [],
                  salutationRef: employee?.salutationRef || '',
                  firstName: employee?.firstName || '',
                  lastName: employee?.lastName || '',
                  displayName: employee?.displayName || '',
                  preferredName: employee?.preferredName || '',
                  birthName: employee?.birthName || '',
                  birthDate: employee?.birthDate ? formatDateToISO(new Date(employee.birthDate)) : '',
                  genderRef: employee?.genderRef || '',
                  nationalityRef: employee?.nationalityRef || '',
                  languageRef: employee?.languageRef || '',
                  maritalStatusRef: employee?.maritalStatusRef || '',
                  birthPlace: employee?.birthPlace || '',
                  severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? 0,
                  schoolQualificationRef: employee?.schoolQualificationRef || '',
                  userId: employee?.userId || '',
                },
              };
              try {
                dispatchProcessContinueEvent('pse_submit', payload);
              } catch (e) {
                console.warn('Submit payload', payload);
              }
            })}
          >
            {/* Group 1: Names */}
            <NamesGroup control={form.control} catalogs={{ salutation: catalogSalutation }} />

            {/* Group 2: Birth and Gender (includes DOB & Place) */}
            <BirthAndGenderGroup control={form.control} catalogs={{ gender: catalogs.gender }} />

            {/* Birth Name (kept with birth related info) */}
            <FormField
              control={form.control}
              name="birthName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="change-personal-data-birth-name-label">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.birth_mame', 'Birth Name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter')} data-testid="change-personal-data-birth-name-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Group 3: Nationality, Language, Marital Status, Disability */}
            <NationalityLanguageStatusGroup control={form.control} catalogs={{ nationality: catalogs.nationality, language: catalogs.language, maritalStatus: catalogs.maritalStatus }} />

            {/* Qualification fields (school + academic titles) */}
            <QualificationFields control={form.control} catalogs={{ schoolQualification: catalogs.schoolQualification, academicTitle: catalogs.academicTitle }} />

            <div className="gba:flex-grow" data-testid="change-personal-data-spacer" />

            <Separator className="gba:mt-[46px] gba:mb-[30px]" data-testid="change-personal-data-divider" />

            <div className="gba:py-4" data-testid="change-personal-data-actions-wrapper">
              <div className="gba:flex gba:justify-between" style={{ width: '100%' }} data-testid="change-personal-data-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset(defaultValues)}
                  className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                  style={{ borderRadius: '22px', height: '40px' }}
                  data-testid="change-personal-data-cancel-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={!form.formState.isValid || isUnchanged}
                  className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                  style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
                  data-testid="change-personal-data-submit-button"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_save', 'Create')}
                </Button>
              </div>
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
};

export const ChangePersonalData: React.FC<ChangePersonalDataFormProps> = (context) => {
  return (
    <ChangePersonalDataProvider {...context}>
      <ChangePersonalDataContent {...context} />
    </ChangePersonalDataProvider>
  );
};

export default ChangePersonalData;


