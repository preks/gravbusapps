import React from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import FormWrapperModal from "../../apps/generic-components/form-wrapper/FormWrapperModal";
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import type { EmploymentType } from "../../apps/employment-data";
import { useTranslation } from "react-i18next";
import { EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION } from "@/business-apps/hr/core/forms/job-position/hooks/useEmploymentTypes";

export interface EmploymentTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  employmentType?: EmploymentType;
  onCancel?: () => void;
  childAddButton: React.ReactNode;
  refetch: () => void;
  accessToken: string;
  isDrawerActive?: boolean;
}

const EmploymentTypeForm: React.FC<EmploymentTypeFormProps> = ({
  prefixDataTestId,
  employmentType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  isDrawerActive,
}) => {
  const { t } = useTranslation("master-data");
  const dataTestId = formatDataTestId(prefixDataTestId, "EmploymentTypeForm");
  const catalogClient = useCatalogManagerClient(accessToken);

  const handleSubmit = async (values: any) => {
    const payload = {
      ...(employmentType ? { id: employmentType.id } : {}),
      code: values.code,
      value: values.value,
      alternativeCode: values.alternativeCode,
      additionalValue1: values.additionalValue1,
      additionalValue2: values.additionalValue2,
      additionalValue3: values.additionalValue3,
      translations: [],
    };

    if (employmentType) {
      await catalogClient.updateCatalogEntry(employmentType.id ?? "", payload);
    } else {
      await catalogClient.createCatalogEntry(
        EMPLOYMENT_TYPE_CATALOG,
        EMPLOYMENT_TYPE_VERSION,
        payload
      );
    }

    refetch();
  };

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={employmentType ? "Edit Employment Type" : "Create Employment Type"}
      description="Configure employment type details and additional information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={employmentType || {}}
      isEditing={!!employmentType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="code"
        rules={{
          required: t("forms.employmentType.fields.code.validation", {
            defaultValue: "Please enter employment type code",
          }),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.code.label", {
                defaultValue: "Code",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("forms.employmentType.fields.code.placeholder", {
                  defaultValue: "Enter code",
                })}
                {...field}
                data-testid={`${dataTestId}-code-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="value"
        rules={{
          required: t("forms.employmentType.fields.name.validation", {
            defaultValue: "Please enter employment type name",
          }),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.name.label", {
                defaultValue: "Name",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("forms.employmentType.fields.name.placeholder", {
                  defaultValue: "Enter name",
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="alternativeCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.alternativeCode.label", {
                defaultValue: "Alternative Code",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "forms.employmentType.fields.alternativeCode.placeholder",
                  { defaultValue: "Enter alternative code (optional)" }
                )}
                {...field}
                data-testid={`${dataTestId}-alternative-code-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="additionalValue1"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.additionalValue1.label", {
                defaultValue: "Additional Value 1",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "forms.employmentType.fields.additionalValue1.placeholder",
                  { defaultValue: "Enter additional value (optional)" }
                )}
                {...field}
                data-testid={`${dataTestId}-additional-value1-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="additionalValue2"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.additionalValue2.label", {
                defaultValue: "Additional Value 2",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "forms.employmentType.fields.additionalValue2.placeholder",
                  { defaultValue: "Enter additional value (optional)" }
                )}
                {...field}
                data-testid={`${dataTestId}-additional-value2-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="additionalValue3"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.employmentType.fields.additionalValue3.label", {
                defaultValue: "Additional Value 3",
              })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t(
                  "forms.employmentType.fields.additionalValue3.placeholder",
                  { defaultValue: "Enter additional value (optional)" }
                )}
                {...field}
                data-testid={`${dataTestId}-additional-value3-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  );
};

export default EmploymentTypeForm;
