import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel, formatDateToISO } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import UploadComponent from '../components/UploadComponent';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { ChangePersonalDataProvider, useChangePersonalData } from './ChangePersonalDataContext';
import { useForm } from 'react-hook-form';
import { Separator, Button } from '@newwork/nw-design-system';
import type { PersonalDataFormValues, CatalogEntry } from './types';
import NamesGroup from './components/NamesGroup';
import BirthAndGenderGroup from './components/BirthAndGenderGroup';
import NationalityLanguageStatusGroup from './components/NationalityLanguageStatusGroup';
import QualificationFields from './components/QualificationFields';
import { useFileClient } from '@/common/network/files/useFileClient';
import { env } from '@/common/env/EnvUtils';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';
// import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
 

export interface ChangePersonalDataFormProps extends BusinessAppContextProps {}

// form values type moved to types.ts

const ChangePersonalDataContent: React.FC<ChangePersonalDataFormProps> = ({ accessToken, additionalData }) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const { data } = useChangePersonalData();
 
  const employee = useMemo(() => data?.employee?.EmployeeByPk, [data]);
  const catalogSalutation: CatalogEntry[] = useMemo(() => data?.catalogs?.salutation || [], [data]);
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
    const preferred = (emp?.preferredName || '').toString().trim();
    const first = (emp?.firstName || '').toString().trim();
    const last = (emp?.lastName || '').toString().trim();
    const parts = preferred
      ? [title, preferred, last]
      : [title, first, last];
    return parts.filter(Boolean).join(' ').trim();
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

  // Normalize default values to match Select option value types (string ids)
  const normalizedDefaults: PersonalDataFormValues = useMemo(() => {
    const toIdString = (val: any) => (val === null || val === undefined || val === '' ? null : String(val));
    const findId = (list: CatalogEntry[] | undefined, current: any) => {
      if (!list || current === null || current === undefined || current === '') return null;
      const currentStr = String(current);
      const match = list.find((e) => String(e?.id) === currentStr || String(e?.value) === currentStr || String(e?.translations?.[0]?.value) === currentStr);
      return match ? String(match.id) : toIdString(current);
    };

    return {
      ...defaultValues,
      salutationRef: findId(catalogSalutation, defaultValues.salutationRef),
      genderRef: findId(catalogs.gender, defaultValues.genderRef),
      nationalityRef: findId(catalogs.nationality, defaultValues.nationalityRef),
      languageRef: findId(catalogs.language, defaultValues.languageRef),
      maritalStatusRef: findId(catalogs.maritalStatus, defaultValues.maritalStatusRef),
      schoolQualificationRef: findId(catalogs.schoolQualification, defaultValues.schoolQualificationRef),
      academicTitleRefs: Array.isArray(defaultValues.academicTitleRefs)
        ? defaultValues.academicTitleRefs.map((v) => findId(catalogs.academicTitle, v)).filter(Boolean) as string[]
        : [],
    } as PersonalDataFormValues;
  }, [defaultValues, catalogSalutation, catalogs]);

  // Reset to normalized defaults whenever employee/catalogs change
  useEffect(() => {
    form.reset(normalizedDefaults);
  }, [normalizedDefaults]);

  // Track initial values for change detection
  const initialRef = useRef<PersonalDataFormValues>(normalizedDefaults);
  useEffect(() => {
    initialRef.current = normalizedDefaults;
  }, [normalizedDefaults]);

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
  const isUnchangedNow = useMemo(() => {
    return (
      JSON.stringify(normalizeForCompare(watchedValues as any)) ===
      JSON.stringify(normalizeForCompare(initialRef.current))
    );
  }, [watchedValues]);

  const title = useMemo(() =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.employee_tabs.flows_button.change_personal_data',
      'Change Personal Data'
    ),
    []
  );


  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]" data-testid="flw_changePersonalData_screenContentLayout">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-personal-data']]:!px-0" data-testid="change-personal-data-form-content">
        <UploadComponent
          dataTestIdPrefix="flw_changePersonalData_uploadFile"
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
                  additionalData?.psi_taskPayload?.employeeId ||
                  additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
                  data?.employee?.EmployeeByPk?.id ||
                  data?.employee?.EmployeeByPk?.employeeId;

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

            return { ...(values as any), employeeDocumentId: uploadedEmployeeDocumentId } as PersonalDataFormValues;
          }}
          onSubmit={async (values: PersonalDataFormValues) => {
            const uploadedEmployeeDocumentId = values.employeeDocumentId || '';
            const payload = {
              event: 'pse_submit',
              employeeDocument: null,
              personalInformation: {
                id: employee?.id || '',
                notes: values.comment || '',
                title: values.title || '',
                personalDocument: uploadedEmployeeDocumentId || null, //uploadedEmployeeDocumentId || 
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
                severelyDisabilityDegree: values.severelyDisabilityDegree !== '' ? values.severelyDisabilityDegree : "",
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
                severelyDisabilityDegree: employee?.severelyDisabilityDegree ?? "",
                schoolQualificationRef: employee?.schoolQualificationRef || '',
                userId: employee?.userId || '',
              },
            };
            return payload;
          }}
          data-testid="change-personal-data"
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.submit', 'Submit')}
        >
          <div className="gba:flex-1 gba:space-y-4" data-testid="change-personal-data-groups">
            {/* Group 1: Names */}
            <NamesGroup control={form.control} catalogs={{ salutation: catalogSalutation }} />

            {/* Group 2: Birth and Gender (includes DOB & Place) */}
            <BirthAndGenderGroup control={form.control} catalogs={{ gender: catalogs.gender }} />

            {/* Group 3: Nationality, Language, Marital Status, Disability */}
            <NationalityLanguageStatusGroup control={form.control} catalogs={{ nationality: catalogs.nationality, language: catalogs.language, maritalStatus: catalogs.maritalStatus }} />

            {/* Qualification fields (school + academic titles) */}
            <QualificationFields control={form.control} catalogs={{ schoolQualification: catalogs.schoolQualification, academicTitle: catalogs.academicTitle }} />
          </div>

          <div className="gba:flex-grow" data-testid="change-personal-data-spacer" />

          <Separator className="gba:mt-4 gba:mb-4" data-testid="change-personal-data-divider" />

          <div className="gba:flex gba:justify-between gba:items-center gba:mt-auto gba:pt-4" data-testid="change-personal-data-actions-wrapper">
            <div className="gba:flex gba:gap-2" data-testid="change-personal-data-actions-left">
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
                  form.reset(defaultValues);
                }}
                data-testid="flw_changePersonalData_btnCancel"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
              </Button>
            </div>
            <div className="gba:flex gba:gap-2" data-testid="change-personal-data-actions-right">
              <Button
                type="submit"
                variant="default"
                disabled={!form.formState.isValid || isUnchangedNow}
                data-testid="flw_changePersonalData_btnSubmit"
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

export const ChangePersonalData: React.FC<ChangePersonalDataFormProps> = (context) => {
  return (
    <><ChangePersonalDataProvider {...context}>
      <ChangePersonalDataContent {...context} />
    </ChangePersonalDataProvider>
    </>
  );
};

export default ChangePersonalData;


