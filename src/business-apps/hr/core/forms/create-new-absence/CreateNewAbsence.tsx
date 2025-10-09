import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Textarea,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Label,
  Alert,
} from '@newwork/nw-design-system';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { Upload } from 'antd';
import type { UploadFile } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';

import dayjs from 'dayjs';
import flowSmall from '@/assets/icons/flowSmall.svg';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getAllEmployees } from './queries/getAllEmployees';
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext';
import {
  getCurrentActiveUserLocale,
  getCurrentActiveStructureId,
  getTranslationFromI18nKeyAndLabel,
} from '@/common/utils/windowUtils';
import { useAbsenceValidation } from './hooks/useAbsenceValidation';
import { useFileClient } from '@/common/network/files/useFileClient';
import { useAbsenceTypesByGroup } from './hooks/useAbsenceTypesByGroup';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';

type Employee = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
};

type CreateNewAbsenceFormValues = {
  selectedType: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  selectedSubstitute?: string;
  comment: string;
};

export const CreateNewAbsence: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo, additionalData } = props;
  const client = useGraphQLClient(accessToken);
  const locale = getCurrentActiveUserLocale();
  const structureId = getCurrentActiveStructureId();

  const propStartDate = additionalData?.psi_taskPayload?.psi_initialParameters?.startDate;
  const propEndDate = additionalData?.psi_taskPayload?.psi_initialParameters?.endDate;

  const initialStartDate = propStartDate ? new Date(propStartDate) : undefined;
  const initialEndDate = propEndDate ? new Date(propEndDate) : undefined;

  const processName = additionalData?.psi_processMetadata?.processMetadata?.name;
  const processToParentAbsenceTypeMap: Record<string, string> = {
    createEmployeeVacation: 'AbsenceType:v1:A001',
    createEmployeeSickLeave: 'AbsenceType:v1:A021',
    createEmployeeSpecialLeave: 'AbsenceType:v1:A050',
  };
  const mappedParentType = processName && processToParentAbsenceTypeMap[processName];
  const absenceType = mappedParentType || '';

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Use the hook for absence types
  const { absenceTypes: types } = useAbsenceTypesByGroup(props, absenceType);

  const initialFormValues: CreateNewAbsenceFormValues = {
    selectedType: '',
    startDate: initialStartDate,
    endDate: initialEndDate,
    selectedSubstitute: undefined,
    comment: '',
  };

  // Initialize react-hook-form
  const form = useForm<CreateNewAbsenceFormValues>({
    defaultValues: initialFormValues,
  });

  const formValuesState = form.watch();

  // Add validation hook
  const {
    isValidating,
    hasValidationErrors,
    overlapErrors,
    balanceErrors,
    generalErrors,
    existingSickLeave,
    hasExistingSickLeave,
    validationWarnings,
  } = useAbsenceValidation({
    accessToken,
    employeeId: userInfo?.employeeDetails?.employeeId || '',
    selectedType: formValuesState.selectedType || '',
    startDate: formValuesState.startDate,
    endDate: formValuesState.endDate,
    locale,
    context: props,
  });

  // Keep end date in sync to allow same-day selection and prevent end < start
  useEffect(() => {
    const start = formValuesState.startDate;
    const end = formValuesState.endDate;
    if (!start) return;
    if (!end || end < start) {
      form.setValue('endDate', start);
    }
  }, [formValuesState.startDate, formValuesState.endDate, form]);

  // State for sick leave update/create mode
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [showSickLeaveOptions, setShowSickLeaveOptions] = useState(false);

  // State for file upload
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const fileClient = useFileClient({ accessToken });

  useEffect(() => {
    if (!accessToken || !userInfo?.id) return;
    client
      .request(getAllEmployees, {
        excludeUserId: userInfo.id,
        activeStructure: structureId,
      })
      .then((res: { Employee?: Employee[] }) => {
        setEmployees(res?.Employee || []);
      });
  }, [accessToken, userInfo?.id, structureId, client]);

  // Auto-select if only one type is available
  useEffect(() => {
    if (types.length === 1 && !formValuesState.selectedType) {
      form.setValue('selectedType', types[0].id);
    }
  }, [types, formValuesState.selectedType, form]);

  // Show sick leave options immediately when existing sick leave is found AND we're in health group
  useEffect(() => {
    // Only show options if there's an existing sick leave for today AND we're in the health absence group
    const isHealthGroup = absenceType === 'AbsenceGroup:v1:HEALTH';

    if (hasExistingSickLeave && existingSickLeave && isHealthGroup) {
      setShowSickLeaveOptions(true);
    } else {
      setShowSickLeaveOptions(false);
      setIsUpdateMode(false);
    }
  }, [hasExistingSickLeave, existingSickLeave, absenceType]);

  const isMandatoryFieldsCompleted = useMemo(() => {
    return !!(formValuesState.selectedType && formValuesState.startDate && formValuesState.endDate);
  }, [formValuesState.selectedType, formValuesState.startDate, formValuesState.endDate]);

  const isFormValid = useMemo(() => {
    // In update mode, be more lenient - allow updates as long as basic fields exist and no validation errors
    if (isUpdateMode) {
      const updateModeValid =
        formValuesState.selectedType &&
        formValuesState.startDate &&
        formValuesState.endDate &&
        !hasValidationErrors &&
        !isValidating;

      return updateModeValid;
    }

    // In create mode, use strict validation
    const createModeValid = isMandatoryFieldsCompleted && !hasValidationErrors && !isValidating;

    return createModeValid;
  }, [
    isUpdateMode,
    isMandatoryFieldsCompleted,
    hasValidationErrors,
    isValidating,
    formValuesState.selectedType,
    formValuesState.startDate,
    formValuesState.endDate,
  ]);

  // Handle update existing sick leave
  const handleUpdateExisting = useCallback(() => {
    if (!existingSickLeave) return;

    setIsUpdateMode(true);
    setShowSickLeaveOptions(false);

    // Pre-fill form with existing data
    form.reset({
      selectedType: existingSickLeave.typeRef,
      startDate: new Date(existingSickLeave.startDate),
      endDate: new Date(existingSickLeave.endDate),
      selectedSubstitute: existingSickLeave.substituteEmployee?.id || undefined,
      comment: existingSickLeave.description || '',
    });
  }, [existingSickLeave, form]);

  // Handle create new absence
  const handleCreateNew = useCallback(() => {
    setIsUpdateMode(false);
    setShowSickLeaveOptions(false);
    // Keep current form values as they are
  }, []);

  // File upload handlers - following DocumentUploadForm pattern
  const handleFileChange = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    // Limit to 5 files
    const limitedFileList = newFileList.slice(-5);
    setFileList(limitedFileList);
  }, []);

  const beforeUpload = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const isValidType = allowedTypes.includes(file.type);

    if (!isValidType) {
      return false;
    }

    // Validate file size (max 10MB)
    const isValidSize = file.size / 1024 / 1024 < 10;

    if (!isValidSize) {
      return false;
    }

    return false; // Prevent auto upload - upload during form submission
  }, []);

  // Main submission handler for AppActionForm
  const handleFormSubmit = useCallback(
    async (formData: CreateNewAbsenceFormValues) => {
      // Build base absence data
      const baseAbsenceData = {
        employeeId: userInfo?.employeeDetails.employeeId,
        typeRef: formData.selectedType,
        startDate: formData.startDate ? dayjs(formData.startDate).format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? dayjs(formData.endDate).format('YYYY-MM-DD') : null,
        substituteEmployee: formData.selectedSubstitute,
        description: formData.comment,
        status: 'PENDING',
      };

      // Upload files and create employeeDocument records
      const employeeDocuments = [];

      for (const fileItem of fileList) {
        if (fileItem.originFileObj) {
          try {
            // Upload file using fileClient - following DocumentUploadForm pattern
            const pathParams = { accessScope: 'public' };
            const queryParams = {
              appName: 'employee-profile',
              folderPath: `/documents/${userInfo?.employeeDetails?.employeeId || ''}/absences`,
            };

            const uploadResponse = await fileClient.uploadFile(
              fileItem.originFileObj,
              pathParams,
              queryParams,
            );

            // Create employeeDocument record
            const employeeDocument = {
              employeeId: userInfo?.employeeDetails?.employeeId,
              documentGroup: 'DocumentGroup:v1:PERSONAL',
              type: 'DocumentType:v1:16',
              name: uploadResponse.fileInfo.fileMetadata?.originalFileName || fileItem.name,
              file: uploadResponse.fileInfo.fileId,
              mimeType:
                uploadResponse.fileInfo.fileMetadata?.mimeType || fileItem.originFileObj.type,
              description: formData.comment,
              fileSize: fileItem.originFileObj.size,
              validFrom: formData.startDate ? dayjs(formData.startDate).format('YYYY-MM-DD') : null,
              validTo: formData.endDate
                ? dayjs(formData.endDate).format('YYYY-MM-DD') + 'T23:59:00'
                : null,
            };

            employeeDocuments.push(employeeDocument);
          } catch {
            // Continue with other files even if one fails
          }
        }
      }

      const payload =
        isUpdateMode && existingSickLeave
          ? {
              employeeAbsence: {
                ...baseAbsenceData,
                id: existingSickLeave.id,
                version: existingSickLeave.version,
              },
              ...(employeeDocuments.length > 0 && { employeeDocuments }),
            }
          : {
              employeeAbsence: baseAbsenceData,
              ...(employeeDocuments.length > 0 && { employeeDocuments }),
            };

      return payload;
    },
    [userInfo?.employeeDetails.employeeId, fileList, isUpdateMode, existingSickLeave, fileClient],
  );

  // Validation function for AppActionForm
  const validateForm = useCallback(
    (formData: CreateNewAbsenceFormValues): string[] | null => {
      const errors: string[] = [];

      if (!formData.selectedType) {
        errors.push('Type is required');
      }
      if (!formData.startDate) {
        errors.push('Start date is required');
      }
      if (!formData.endDate) {
        errors.push('End date is required');
      }
      if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
        errors.push('End date must be after start date');
      }

      // Add validation errors from the validation hook
      if (hasValidationErrors) {
        generalErrors.forEach((error) => errors.push(error.message));
        overlapErrors.forEach((error) => errors.push(error.message));
        balanceErrors.forEach((error) => errors.push(error.message));
      }

      return errors.length > 0 ? errors : null;
    },
    [hasValidationErrors, generalErrors, overlapErrors, balanceErrors],
  );

  return (
    <div
      className="gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-white gba:mt-3"
      data-testid="create-new-absence-root"
    >
      <div
        className="gba:flex gba:items-center gba:pb-6 gba:gap-2 gba:w-100 gba:border-b"
        data-testid="create-new-absence-header"
        style={{ borderBottomColor: '#E0E0E0' }}
      >
        <img
          src={flowSmall}
          alt="Flow Small"
          style={{
            filter: 'brightness(0)',
            fill: '#000',
            width: '24px',
            height: '24px',
          }}
        />
        <h1
          className="gba:text-2xl gba:font-bold gba:text-center"
          data-testid="create-new-absence-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_form.create_new_title',
            'Create New Absence',
          )}
        </h1>
      </div>
      <div className="gba:flex-grow gba:w-full">
        <AppActionForm
          processType={isUpdateMode ? 'update' : 'create'}
          onSubmit={handleFormSubmit}
          formData={formValuesState}
          validateForm={validateForm}
          form={form}
          businessAppContext={props}
          submitButtonText={isUpdateMode ? 'Update' : 'Submit'}
          isSubmitDisabled={!isFormValid || isValidating}
          data-testid="create-new-absence-form"
        >
          <div
            className="gba:p-6 gba:bg-white gba:w-full gba:max-w-md"
            data-testid="create-new-absence-form-content"
          >
            {/* Sick Leave Options - Show First When Existing Sick Leave Found */}
            {showSickLeaveOptions && existingSickLeave && (
              <div
                className="gba:mb-4 gba:p-4 gba:border gba:border-orange-300 gba:bg-orange-50 gba:rounded"
                data-testid="sick-leave-options-container"
              >
                <div className="gba:mb-3">
                  <h4 className="gba:text-sm gba:font-semibold gba:text-orange-800 gba:mb-2">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.existing_found',
                      'Existing Sick Leave Found',
                    )}
                  </h4>
                  <p className="gba:text-sm gba:text-orange-700">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.existing_message',
                      'You already have a sick leave for today. Would you like to update it or create a new absence?',
                    )}
                  </p>
                </div>
                <div className="gba:flex gba:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gba:border-orange-400 gba:text-orange-700 hover:gba:bg-orange-100"
                    onClick={handleUpdateExisting}
                    data-testid="update-existing-sick-leave-button"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.update_existing',
                      'Update Existing',
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gba:border-orange-400 gba:text-orange-700 hover:gba:bg-orange-100"
                    onClick={handleCreateNew}
                    data-testid="create-new-absence-button"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.create_new',
                      'Create New',
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Main Form - Hidden When Showing Sick Leave Options */}
            {!showSickLeaveOptions && (
              <>
                <div className="gba:mb-4 gba:w-full">
                  <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="type-Label">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.type',
                      'Type',
                    )}
                    <span className="gba:text-red-500 gba:ml-1">*</span>
                  </Label>
                  <div className="gba:w-full">
                    <Select
                      data-testid="type-dropdown"
                      value={formValuesState.selectedType || ''}
                      onValueChange={(value: string) => {
                        form.setValue('selectedType', value);
                      }}
                      disabled={types.length <= 1}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_form.select_type',
                            'Select a type',
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="gba:mb-4">
                  <Label
                    className="gba:block gba:mb-2 gba:font-medium"
                    data-testid="start-date-Label"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_table.start_date',
                      'Start Date',
                    )}
                    <span className="gba:text-red-500 gba:ml-1">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                        data-testid="start-date-trigger"
                      >
                        <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                        {formValuesState.startDate
                          ? dayjs(formValuesState.startDate).format('YYYY-MM-DD')
                          : getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_form.select_start_date',
                              'Select start date',
                            )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="gba:w-auto gba:p-0">
                      <Calendar
                        mode="single"
                        selected={formValuesState.startDate}
                        onSelect={(date: Date | undefined) => form.setValue('startDate', date)}
                        data-testid="start-date-calendar"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="gba:mb-4">
                  <Label
                    className="gba:block gba:mb-2 gba:font-medium"
                    data-testid="end-date-Label"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_table.end_date',
                      'End Date',
                    )}
                    <span className="gba:text-red-500 gba:ml-1">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="gba:w-full gba:justify-start gba:text-left gba:font-normal"
                        data-testid="end-date-trigger"
                      >
                        <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                        {formValuesState.endDate
                          ? dayjs(formValuesState.endDate).format('YYYY-MM-DD')
                          : getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_form.select_end_date',
                              'Select end date',
                            )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="gba:w-auto gba:p-0">
                      <Calendar
                        mode="single"
                        selected={formValuesState.endDate}
                        onSelect={(date: Date | undefined) => form.setValue('endDate', date)}
                        disabled={(date) => {
                          if (!formValuesState.startDate) return false;
                          return (
                            date < formValuesState.startDate || date === formValuesState.startDate
                          );
                        }}
                        data-testid="end-date-calendar"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {absenceType !== 'AbsenceGroup:v1:WORK' && (
                  <div className="gba:mb-4 gba:w-full">
                    <Label
                      className="gba:block gba:mb-2 gba:font-medium"
                      data-testid="substitute-Label"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_form.substitute',
                        'Substitute',
                      )}
                    </Label>
                    <div className="gba:w-full">
                      <Select
                        data-testid="substitute-dropdown"
                        value={formValuesState.selectedSubstitute || ''}
                        onValueChange={(value: string) =>
                          form.setValue('selectedSubstitute', value)
                        }
                      >
                        <SelectTrigger className="gba:w-full">
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_form.select_substitute',
                              'Select substitute',
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="gba:mb-4">
                  <Label className="gba:block gba:mb-2 gba:font-medium" data-testid="comment-Label">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                      'Comment',
                    )}
                  </Label>
                  <Textarea
                    data-testid="comment-textarea"
                    className="gba:w-full gba:min-h-[80px] gba:rounded gba:border gba:border-gray-300 gba:p-2 gba:text-base"
                    value={formValuesState.comment || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      form.setValue('comment', e.target.value)
                    }
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.comment_text_area_placeholder',
                      'Add a comment (optional)',
                    )}
                  />
                </div>

                {/* Update Mode Indicator */}
                {isUpdateMode && existingSickLeave && (
                  <div
                    className="gba:mb-4 gba:p-3 gba:border gba:border-blue-300 gba:bg-blue-50 gba:rounded"
                    data-testid="update-mode-indicator"
                  >
                    <p className="gba:text-sm gba:text-blue-700 gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_form.update_mode_indicator',
                        'Updating existing absence',
                      )}
                    </p>
                  </div>
                )}

                {/* Validation Errors/Warnings Display */}
                {(hasValidationErrors || validationWarnings.length > 0) && (
                  <div className="gba:mb-4" data-testid="validation-errors-container">
                    {generalErrors.map((error, index) => (
                      <Alert
                        key={`general-${index}`}
                        className="gba:mb-2"
                        data-testid={`general-error-${index}`}
                      >
                        <AlertCircle className="gba:h-4 gba:w-4" />
                        <span>{error.message}</span>
                      </Alert>
                    ))}

                    {overlapErrors.map((error, index) => (
                      <Alert
                        key={`overlap-${index}`}
                        className="gba:mb-2"
                        data-testid={`overlap-error-${index}`}
                      >
                        <AlertCircle className="gba:h-4 gba:w-4" />
                        <span>{error.message}</span>
                      </Alert>
                    ))}

                    {balanceErrors.map((error, index) => (
                      <Alert
                        key={`balance-${index}`}
                        className="gba:mb-2"
                        data-testid={`balance-error-${index}`}
                      >
                        <AlertCircle className="gba:h-4 gba:w-4" />
                        <span>{error.message}</span>
                      </Alert>
                    ))}
                    {validationWarnings.map((warning, index) => (
                      <Alert
                        key={`warning-${index}`}
                        className="gba:mb-2"
                        data-testid={`validation-warning-${index}`}
                      >
                        <AlertCircle className="gba:h-4 gba:w-4" />
                        <span>{warning.message}</span>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Loading indicator for validation */}
                {isValidating && (
                  <div
                    className="gba:mb-4 gba:text-center gba:text-sm gba:text-gray-600"
                    data-testid="validation-loading"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_form.validation_checking',
                      'Checking availability...',
                    )}
                  </div>
                )}

                {/* File Upload Section - Only for Health Group */}
                {absenceType === 'AbsenceGroup:v1:HEALTH' && (
                  <div className="gba:mb-4">
                    <Label
                      className="gba:block gba:mb-2 gba:font-medium"
                      data-testid="attachments-label"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_item_request_card.attachments',
                        'Attachments',
                      )}
                    </Label>
                    <Upload
                      fileList={fileList}
                      onChange={handleFileChange}
                      beforeUpload={beforeUpload}
                      multiple
                      maxCount={5}
                      accept=".pdf,.jpg,.jpeg,.png"
                      data-testid="file-upload"
                      className="gba:w-full"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="gba:w-full gba:h-12 gba:border-dashed gba:border-2 gba:border-gray-300 hover:gba:border-blue-400"
                        data-testid="upload-button"
                      >
                        <UploadOutlined className="gba:mr-2" />
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_form.upload_button',
                          'Click or drag files to upload',
                        )}
                      </Button>
                    </Upload>
                    <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_form.upload_hint',
                        'Supported formats: PDF, JPG, PNG (max 10MB each, up to 5 files)',
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </AppActionForm>
      </div>
    </div>
  );
};

export default CreateNewAbsence;
