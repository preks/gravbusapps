import React, { useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useTranslation } from "react-i18next";
import FormWrapperModal from "../../apps/generic-components/form-wrapper/FormWrapperModal";
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import { env } from "@/common/env/EnvUtils";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { PayGrade } from "../../apps/compensation-data/components/tabs";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

const DATA_TEST_ID_PREFIX = "PayGradeForm";

export interface PayGradeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  refetch: () => void;
  payGradeLevel?: number;
  payGrade?: PayGrade;
  childAddButton: React.ReactNode;
  onCancel?: () => void;
  defaultValues?: Record<string, any>;
  isDrawerActive?: boolean;
}

export const PayGradeForm: React.FC<PayGradeFormProps> = ({
  prefixDataTestId,
  refetch,
  payGradeLevel,
  payGrade,
  accessToken,
  childAddButton,
  onCancel,
  defaultValues = {},
  isDrawerActive = false,
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX);
  const { t } = useTranslation("master-data");
  const restClient = useRestClient(
    env("NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT")
  );

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const payload = {
        changeMode: "INSERT",
        compensationBand: {
          ...(payGrade ? { version: payGrade.version, id: payGrade.id } : {}),
          code: values.code,
          name: values.name,
          currency: values.currency,
          maxSalary: values.maxSalary,
          minSalary: values.minSalary,
          standardSalary: values.standardSalary,
          payGrade: payGradeLevel,
        },
      };

      await restClient.post(
        "/employee/saveCompensationBand",
        {
          ...payload,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      refetch();
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        payGrade
          ? t("forms.payGrade.edit.title", { defaultValue: "Edit Pay Grade" })
          : t("forms.payGrade.create.title", {
              defaultValue: "Create Pay Grade",
            })
      }
      description={t("forms.payGrade.description", {
        defaultValue: "Configure pay grade details and salary ranges",
      })}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        payGrade
          ? {
              ...payGrade,
              // Transform currency object to string format if needed
              currency: payGrade.currency?.id
                ? `Currency:v1:${payGrade.currency.id}`
                : payGrade.currency || "Currency:v1:EUR",
            }
          : {
              ...defaultValues,
              currency: "Currency:v1:EUR",
            }
      }
      isEditing={!!payGrade}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="code"
        rules={{
          required: t("forms.payGrade.fields.code.validation", {
            defaultValue: "Please enter pay grade code",
          }),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.payGrade.fields.code.label", { defaultValue: "Code" })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("forms.payGrade.fields.code.placeholder", {
                  defaultValue: "Enter pay grade code",
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
        name="name"
        rules={{
          required: t("forms.payGrade.fields.name.validation", {
            defaultValue: "Please enter pay grade name",
          }),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.payGrade.fields.name.label", { defaultValue: "Name" })}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("forms.payGrade.fields.name.placeholder", {
                  defaultValue: "Enter pay grade name",
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <FormField
          name="minSalary"
          rules={{
            required: t("forms.payGrade.fields.minSalary.validation", {
              defaultValue: "Please enter minimum salary",
            }),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("forms.payGrade.fields.minSalary.label", {
                  defaultValue: "Minimum Salary",
                })}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t(
                    "forms.payGrade.fields.minSalary.placeholder",
                    {
                      defaultValue: "Minimum salary",
                    }
                  )}
                  className="gba:w-full"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  data-testid={`${dataTestId}-min-salary-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="standardSalary"
          rules={{
            required: t("forms.payGrade.fields.standardSalary.validation", {
              defaultValue: "Please enter standard salary",
            }),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("forms.payGrade.fields.standardSalary.label", {
                  defaultValue: "Standard Salary",
                })}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t(
                    "forms.payGrade.fields.standardSalary.placeholder",
                    {
                      defaultValue: "Standard salary",
                    }
                  )}
                  className="gba:w-full"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  data-testid={`${dataTestId}-standard-salary-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="maxSalary"
          rules={{
            required: t("forms.payGrade.fields.maxSalary.validation", {
              defaultValue: "Please enter maximum salary",
            }),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("forms.payGrade.fields.maxSalary.label", {
                  defaultValue: "Maximum Salary",
                })}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t(
                    "forms.payGrade.fields.maxSalary.placeholder",
                    {
                      defaultValue: "Maximum salary",
                    }
                  )}
                  className="gba:w-full"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  data-testid={`${dataTestId}-max-salary-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="currency"
        rules={{
          required: t("forms.payGrade.fields.currency.validation", {
            defaultValue: "Please select currency",
          }),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("forms.payGrade.fields.currency.label", {
                defaultValue: "Currency",
              })}
            </FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger data-testid={`${dataTestId}-currency-select`}>
                  <SelectValue
                    placeholder={t(
                      "forms.payGrade.fields.currency.placeholder",
                      {
                        defaultValue: "Select currency",
                      }
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Currency:v1:EUR">
                    {t("forms.payGrade.fields.currency.options.eur", {
                      defaultValue: "Euro (EUR)",
                    })}
                  </SelectItem>
                  <SelectItem value="Currency:v1:USD">
                    {t("forms.payGrade.fields.currency.options.usd", {
                      defaultValue: "US Dollar (USD)",
                    })}
                  </SelectItem>
                  <SelectItem value="Currency:v1:GBP">
                    {t("forms.payGrade.fields.currency.options.gbp", {
                      defaultValue: "British Pound (GBP)",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  );
};

export default PayGradeForm;
