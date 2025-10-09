import React, { Dispatch, SetStateAction, useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import FormWrapperModal from "../../apps/generic-components/form-wrapper/FormWrapperModal";
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
} from "@newwork/nw-design-system";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { env } from "@/common/env/EnvUtils";
import type { Company } from "../../apps/organizational-data/types";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

const DATA_TEST_ID_PREFIX = "CompanyForm";
const ORGCHART_BASE_URL = `${env("NEXT_PUBLIC_ORGCHART_API_URL")}/orgchart/api/v1`;

export interface CompanyFormProps extends BusinessAppContextProps {
  company?: Company;
  onCancel?: () => void;
  prefixDataTestId?: string;
  childAddButton?: React.ReactNode;
  refetch: () => void;
  defaultValues?: Record<string, Company>;
  isDrawerActive?: boolean;
  structureId: string;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  parentNodeId?: string;
  isRootCompany?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  defaultValues = {},
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  parentNodeId,
  isRootCompany,
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX);
  const restClient = useRestClient(ORGCHART_BASE_URL);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    code: string;
    name: string;
    description?: string;
    percentage?: number;
  }) => {
    try {
      setLoading(true);
      const companyData = {
        code: values.code,
        name: values.name,
        structureId: structureId,
        ...(values.description ? { description: values.description } : {}),
        ...(company ? { id: company.id } : {}),
      };

      const createCompanyPayload = {
        data: {
          companyData: companyData,
        },
        parentNode: parentNodeId,
        type: "company",
      };

      // Handle company creation/update
      if (company) {
        await restClient.put(`/companies/${company.id}`, companyData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        await restClient.post(`/nodes/${structureId}`, createCompanyPayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      // Handle percentage update for companyEdges (only if percentage changed)
      if (company && values.percentage !== undefined && values.percentage !== company.percentage) {
        const updateCompanyEdgesPayload = [
          {
            operation: "UPDATE",
            edge: {
              id: company.edgeId, // Edge ID from companyEdges
              percentage: values.percentage,
              relationshipType: "hierarchical",
              source: company.parentNodeId, // Parent company node ID
              target: company.nodeId, // Current company node ID
            },
          },
        ];

        await restClient.post(`/edges/operations`, updateCompanyEdgesPayload, {
          params: {
            structureId: structureId,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      refetch();
    } catch (error) {
      console.error("Form validation error:", error);
    } finally {
      setLoading(false);
      setOpen?.(false);
    }
  };

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={company ? "Edit Company" : "Create Company"}
      description="Configure company details and information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        company
          ? {
              ...company,
            }
          : {
              ...defaultValues,
            }
      }
      isEditing={!!company}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
    >
      <FormField
        name="name"
        rules={{ required: "Please enter company name" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., NEWWORK Software GmbH, NEWWORK Software Inc."
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="code"
        rules={{ required: "Please enter company code" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Code</FormLabel>
            <FormControl>
              <Input placeholder="e.g., NW" {...field} data-testid={`${dataTestId}-code-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {company && !isRootCompany && (
        <FormField
          name="percentage"
          rules={{
            max: {
              value: 100,
              message: "Percentage cannot be greater than 100%",
            },
            min: {
              value: 0,
              message: "Percentage cannot be less than 0%",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Holding</FormLabel>
              <FormControl>
                <Input
                  placeholder="0%"
                  value={field.value ? `${field.value}%` : "0%"}
                  onChange={(e) => {
                    const value = e.target.value.replace("%", "");
                    const numericValue = parseFloat(value) || 0;
                    // Clamp the value between 0 and 100
                    const clampedValue = Math.min(Math.max(numericValue, 0), 100);
                    field.onChange(clampedValue);
                  }}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  data-testid={`${dataTestId}-holding-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe this company and its business activities"
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  );
};

export default CompanyForm;
