import React, { useEffect, useState } from "react";
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
} from "@newwork/nw-design-system";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Upload } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import dayjs from "dayjs";
import flowSmall from "@/assets/icons/flowSmall.svg";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { getAbsenceTypes } from "./queries/getAbsenceTypes";
import { getAllEmployees } from "./queries/getAllEmployees";
import { BusinessAppContextProps } from "../../../../../common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { getCurrentActiveStructureId } from "@/common/utils/windowUtils";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { useAbsenceValidation } from "./hooks/useAbsenceValidation";
import { useFileClient } from "@/common/network/files/useFileClient";

interface AbsenceType {
  id: string;
  parentEntryId: string;
  translations: { value: string; localeCode: string }[];
}

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

  const absenceType = additionalData?.absenceType || "";

  const [types, setTypes] = useState<AbsenceType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const initialFormValues: CreateNewAbsenceFormValues = {
    selectedType: "",
    startDate: undefined,
    endDate: undefined,
    selectedSubstitute: undefined,
    comment: "",
  };

  const [formValuesState, setFormValuesState] =
    useState<CreateNewAbsenceFormValues>(initialFormValues);

  // Add validation hook
  const {
    isValidating,
    hasValidationErrors,
    overlapErrors,
    balanceErrors,
    generalErrors,
    existingSickLeave,
    hasExistingSickLeave,
  } = useAbsenceValidation({
    accessToken,
    employeeId: userInfo?.employeeDetails?.employeeId || "",
    selectedType: formValuesState.selectedType,
    startDate: formValuesState.startDate,
    endDate: formValuesState.endDate,
    locale,
  });

  // State for sick leave update/create mode
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [showSickLeaveOptions, setShowSickLeaveOptions] = useState(false);

  // State for file upload
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const fileClient = useFileClient({ accessToken } as any);

  useEffect(() => {
    if (!accessToken || !userInfo?.id) return;
    client
      .request(getAllEmployees, {
        excludeUserId: userInfo.id,
        activeStructure: structureId,
      })
      .then((res: any) => {
        setEmployees(res?.Employee || []);
      });
  }, [accessToken, userInfo?.id, structureId, client]);

  useEffect(() => {
    if (!absenceType) {
      setTypes([]);
      setFormValuesState((prev) => ({ ...prev, selectedType: "" }));
      return;
    }

    setFormValuesState((prev) => ({ ...prev, selectedType: "" }));

    client
      .request(getAbsenceTypes, {
        activeUserLocale: locale,
        parentEntryId: absenceType,
      })
      .then((res: { CatalogEntry: AbsenceType[] }) => {
        setTypes(res.CatalogEntry);
      })
      .catch((error) => {
        throw new Error(error);
      });
  }, [client, locale, absenceType]);

  useEffect(() => {
    if (types.length === 1 && !formValuesState.selectedType) {
      const selectedTypeId = types[0].id;
      setFormValuesState((prev) => ({
        ...prev,
        selectedType: selectedTypeId,
      }));
    }
  }, [types, formValuesState.selectedType]);

  // Show sick leave options immediately when existing sick leave is found AND we're in health group
  useEffect(() => {
    // Only show options if there's an existing sick leave for today AND we're in the health absence group
    const isHealthGroup = absenceType === "AbsenceGroup:v1:HEALTH";

    if (hasExistingSickLeave && existingSickLeave && isHealthGroup) {
      setShowSickLeaveOptions(true);
    } else {
      setShowSickLeaveOptions(false);
      setIsUpdateMode(false);
    }
  }, [hasExistingSickLeave, existingSickLeave, absenceType]);

  const isMandatoryFieldsCompleted = React.useMemo(() => {
    return !!(
      formValuesState.selectedType &&
      formValuesState.startDate &&
      formValuesState.endDate
    );
  }, [
    formValuesState.selectedType,
    formValuesState.startDate,
    formValuesState.endDate,
  ]);

  const isFormValid = React.useMemo(() => {
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
    const createModeValid =
      isMandatoryFieldsCompleted && !hasValidationErrors && !isValidating;

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
  const handleUpdateExisting = React.useCallback(() => {
    if (!existingSickLeave) return;

    setIsUpdateMode(true);
    setShowSickLeaveOptions(false);

    // Pre-fill form with existing data
    setFormValuesState({
      selectedType: existingSickLeave.typeRef,
      startDate: new Date(existingSickLeave.startDate),
      endDate: new Date(existingSickLeave.endDate),
      selectedSubstitute: existingSickLeave.substituteEmployee?.id || undefined,
      comment: existingSickLeave.description || "",
    });
  }, [existingSickLeave]);

  // Handle create new absence
  const handleCreateNew = React.useCallback(() => {
    setIsUpdateMode(false);
    setShowSickLeaveOptions(false);
    // Keep current form values as they are
  }, []);

  // File upload handlers - following DocumentUploadForm pattern
  const handleFileChange = React.useCallback(
    ({ fileList: newFileList }: any) => {
      // Limit to 5 files
      const limitedFileList = newFileList.slice(-5);
      setFileList(limitedFileList);
    },
    []
  );

  const beforeUpload = React.useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
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

  const handleSubmit = React.useCallback(
    async (e?: React.FormEvent | React.MouseEvent) => {
      e?.preventDefault();

      if (!isFormValid) {
        return;
      }

      // Build base absence data
      const baseAbsenceData = {
        employeeId: userInfo?.employeeDetails.employeeId,
        typeRef: formValuesState.selectedType,
        startDate: formValuesState.startDate
          ? dayjs(formValuesState.startDate).format("YYYY-MM-DD")
          : null,
        endDate: formValuesState.endDate
          ? dayjs(formValuesState.endDate).format("YYYY-MM-DD")
          : null,
        substituteEmployee: formValuesState.selectedSubstitute,
        description: formValuesState.comment,
        status: "PENDING",
      };

      // Upload files and create employeeDocument records
      const employeeDocuments = [];

      for (const fileItem of fileList) {
        if (fileItem.originFileObj) {
          try {
            // Upload file using fileClient - following DocumentUploadForm pattern
            const pathParams = { accessScope: "public" };
            const queryParams = {
              appName: "employee-profile",
              folderPath: `/documents/${
                userInfo?.employeeDetails?.employeeId || ""
              }/absences`,
            };

            const uploadResponse = await fileClient.uploadFile(
              fileItem.originFileObj,
              pathParams,
              queryParams
            );

            // Create employeeDocument record
            const employeeDocument = {
              employeeId: userInfo?.employeeDetails?.employeeId,
              documentGroup: "DocumentGroup:v1:PERSONAL",
              type: "DocumentType:v1:16",
              name:
                uploadResponse.fileInfo.fileMetadata?.originalFileName ||
                fileItem.name,
              file: uploadResponse.fileInfo.fileId,
              mimeType:
                uploadResponse.fileInfo.fileMetadata?.mimeType ||
                fileItem.originFileObj.type,
              description: formValuesState.comment,
              fileSize: fileItem.originFileObj.size,
              validFrom: formValuesState.startDate
                ? dayjs(formValuesState.startDate).format("YYYY-MM-DD")
                : null,
              validTo: formValuesState.endDate
                ? dayjs(formValuesState.endDate).format("YYYY-MM-DD") +
                  "T23:59:00"
                : null,
            };

            employeeDocuments.push(employeeDocument);
          } catch (err) {
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

      dispatchProcessContinueEvent("pse_submit", payload);
    },
    [
      formValuesState,
      isFormValid,
      userInfo?.employeeDetails.employeeId,
      fileList,
      isUpdateMode,
      existingSickLeave,
      fileClient,
    ]
  );

  const handleCancel = React.useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    setFormValuesState(initialFormValues);
    dispatchProcessContinueEvent("pse_cancel", {});
  }, []);

  return (
    <div
      className="gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-white"
      data-testid="create-new-absence-root"
    >
      <div
        className="gba:flex gba:items-center gba:pb-6 gba:gap-2 gba:w-100 gba:border-b"
        data-testid="create-new-absence-header"
        style={{ borderBottomColor: "#E0E0E0" }}
      >
        <img
          src={flowSmall}
          alt="Flow Small"
          style={{
            filter: "brightness(0)",
            fill: "#000",
            width: "24px",
            height: "24px",
          }}
        />
        <h1
          className="gba:text-2xl gba:font-bold gba:text-center"
          data-testid="create-new-absence-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "absence.createNew.title",
            "Create New Absence"
          )}
        </h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="gba:flex-1 gba:w-full gba:max-w-md gba:flex gba:flex-col gba:justify-between gba:pb-10"
        data-testid="create-new-absence-form-element"
      >
        <div
          className="gba:p-6 gba:bg-white gba:w-full gba:max-w-md"
          data-testid="create-new-absence-form"
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
                    "absence.sickLeave.existingFound",
                    "Existing Sick Leave Found"
                  )}
                </h4>
                <p className="gba:text-sm gba:text-orange-700">
                  {getTranslationFromI18nKeyAndLabel(
                    "absence.sickLeave.existingMessage",
                    "You already have a sick leave for today. Would you like to update it or create a new absence?"
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
                    "absence.sickLeave.updateExisting",
                    "Update Existing"
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
                    "absence.sickLeave.createNew",
                    "Create New"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Main Form - Hidden When Showing Sick Leave Options */}
          {!showSickLeaveOptions && (
            <>
              <div className="gba:mb-4 gba:w-full">
                <Label
                  className="gba:block gba:mb-2 gba:font-medium"
                  data-testid="type-Label"
                >
                  {getTranslationFromI18nKeyAndLabel("absence.type", "Type")}
                  <span className="gba:text-red-500 gba:ml-1">*</span>
                </Label>
                <div className="gba:w-full">
                  <Select
                    data-testid="type-dropdown"
                    value={formValuesState.selectedType || ""}
                    onValueChange={(value: string) => {
                      setFormValuesState((prev) => ({
                        ...prev,
                        selectedType: value,
                      }));
                    }}
                    disabled={types.length <= 1}
                  >
                    <SelectTrigger className="gba:w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.translations.find(
                            (t: any) => t.localeCode === locale
                          )?.value || type.id}
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
                    "absence.startDate",
                    "Start Date"
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
                        ? dayjs(formValuesState.startDate).format("YYYY-MM-DD")
                        : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="gba:w-auto gba:p-0">
                    <Calendar
                      mode="single"
                      selected={formValuesState.startDate}
                      onSelect={(date: Date | undefined) =>
                        setFormValuesState((prev) => ({
                          ...prev,
                          startDate: date,
                        }))
                      }
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
                    "absence.endDate",
                    "End Date"
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
                        ? dayjs(formValuesState.endDate).format("YYYY-MM-DD")
                        : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="gba:w-auto gba:p-0">
                    <Calendar
                      mode="single"
                      selected={formValuesState.endDate}
                      onSelect={(date: Date | undefined) =>
                        setFormValuesState((prev) => ({
                          ...prev,
                          endDate: date,
                        }))
                      }
                      disabled={(date) => {
                        if (!formValuesState.startDate) return false;
                        return date < formValuesState.startDate;
                      }}
                      data-testid="end-date-calendar"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {absenceType !== "AbsenceGroup:v1:WORK" && (
                <div className="gba:mb-4 gba:w-full">
                  <Label
                    className="gba:block gba:mb-2 gba:font-medium"
                    data-testid="substitute-Label"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      "absence.substitute",
                      "Substitute"
                    )}
                  </Label>
                  <div className="gba:w-full">
                    <Select
                      data-testid="substitute-dropdown"
                      value={formValuesState.selectedSubstitute}
                      onValueChange={(value: string) =>
                        setFormValuesState((prev) => ({
                          ...prev,
                          selectedSubstitute: value,
                        }))
                      }
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue placeholder="Select substitute" />
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
                <Label
                  className="gba:block gba:mb-2 gba:font-medium"
                  data-testid="comment-Label"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "absence.comment",
                    "Comment"
                  )}
                </Label>
                <Textarea
                  data-testid="comment-textarea"
                  className="gba:w-full gba:min-h-[80px] gba:rounded gba:border gba:border-gray-300 gba:p-2 gba:text-base"
                  value={formValuesState.comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormValuesState((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "absence.comment.placeholder",
                    "Add a comment (optional)"
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
                      "absence.updateMode.indicator",
                      "Updating existing absence"
                    )}
                  </p>
                </div>
              )}

              {/* Validation Errors Display */}
              {hasValidationErrors && (
                <div
                  className="gba:mb-4"
                  data-testid="validation-errors-container"
                >
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
                </div>
              )}

              {/* Loading indicator for validation */}
              {isValidating && (
                <div
                  className="gba:mb-4 gba:text-center gba:text-sm gba:text-gray-600"
                  data-testid="validation-loading"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "absence.validation.checking",
                    "Checking availability..."
                  )}
                </div>
              )}

              {/* File Upload Section - Only for Health Group */}
              {absenceType === "AbsenceGroup:v1:HEALTH" && (
                <div className="gba:mb-4">
                  <Label
                    className="gba:block gba:mb-2 gba:font-medium"
                    data-testid="attachments-label"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      "absence.attachments",
                      "Attachments"
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
                        "absence.upload.button",
                        "Click or drag files to upload"
                      )}
                    </Button>
                  </Upload>
                  <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                    {getTranslationFromI18nKeyAndLabel(
                      "absence.upload.hint",
                      "Supported formats: PDF, JPG, PNG (max 10MB each, up to 5 files)"
                    )}
                  </div>
                </div>
              )}

              <div
                className="gba:border-t gba:pt-6 gba:mt-6 gba:flex gba:justify-start gba:gap-4"
                style={{ borderTopColor: "#E0E0E0" }}
                data-testid="create-new-absence-footer"
              >
                <Button
                  type="submit"
                  variant="default"
                  className="gba:bg-blue-600 gba:text-white gba:px-5 gba:py-2 gba:rounded gba:font-medium"
                  data-testid="submit-button"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                >
                  {isUpdateMode
                    ? getTranslationFromI18nKeyAndLabel(
                        "absence.update",
                        "Update"
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        "absence.submit",
                        "Submit"
                      )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gba:bg-gray-200 gba:text-gray-700 gba:px-5 gba:py-2 gba:rounded gba:font-medium gba:mr-2"
                  data-testid="cancel-button"
                  onClick={handleCancel}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "absence.cancel",
                    "Cancel"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateNewAbsence;
