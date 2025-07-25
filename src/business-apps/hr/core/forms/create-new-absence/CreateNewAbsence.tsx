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
} from "@newwork/nw-design-system";
import { CalendarIcon } from "lucide-react";
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

interface AbsenceType {
  id: string;
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

  const isWorkLeaveType = types
    .find((t: AbsenceType) => t.id === formValuesState.selectedType)
    ?.translations.some((t: { value: string }) =>
      t.value.toLowerCase().includes("work")
    );

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

  const handleSubmit = React.useCallback(
    (e?: React.FormEvent | React.MouseEvent) => {
      e?.preventDefault();

      if (!isMandatoryFieldsCompleted) {
        return;
      }

      const payload = {
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
      dispatchProcessContinueEvent("pse_submit", payload);
    },
    [formValuesState, isMandatoryFieldsCompleted]
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
                    setFormValuesState((prev) => ({ ...prev, startDate: date }))
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
              {getTranslationFromI18nKeyAndLabel("absence.endDate", "End Date")}
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
                    setFormValuesState((prev) => ({ ...prev, endDate: date }))
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
          {formValuesState.selectedType && !isWorkLeaveType && (
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
              {getTranslationFromI18nKeyAndLabel("absence.comment", "Comment")}
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
              disabled={!isMandatoryFieldsCompleted}
            >
              {getTranslationFromI18nKeyAndLabel("absence.submit", "Submit")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gba:bg-gray-200 gba:text-gray-700 gba:px-5 gba:py-2 gba:rounded gba:font-medium gba:mr-2"
              data-testid="cancel-button"
              onClick={handleCancel}
            >
              {getTranslationFromI18nKeyAndLabel("absence.cancel", "Cancel")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateNewAbsence;
