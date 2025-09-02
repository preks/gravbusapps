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
import type { ContractType } from "../../apps/employment-data";
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION,
} from "@/business-apps/hr/core/forms/job-position/hooks/useContractTypes";

export interface ContractTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  contractType?: Partial<ContractType>;
  onCancel?: () => void;
  childAddButton: React.ReactNode;
  refetch: () => void;
  accessToken: string;
  isDrawerActive?: boolean;
}

const ContractTypeForm: React.FC<ContractTypeFormProps> = ({
  prefixDataTestId,
  contractType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  isDrawerActive,
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, "ContractTypeForm");
  const catalogClient = useCatalogManagerClient(accessToken);

  const handleSubmit = async (data: any) => {
    const payload = {
      ...(contractType ? { id: contractType.id } : {}),
      code: data.code,
      value: data.value,
      alternativeCode: data.alternativeCode,
      additionalValue1: data.additionalValue1,
      additionalValue2: data.additionalValue3,
      additionalValue3: data.additionalValue3,
      translations: [],
    };
    if (contractType) {
      await catalogClient.updateCatalogEntry(contractType.id ?? "", payload);
    } else {
      await catalogClient.createCatalogEntry(
        CONTRACT_TYPE_CATALOG,
        CONTRACT_TYPE_VERSION,
        payload
      );
    }

    refetch();
  };

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={contractType ? "Edit Contract Type" : "Create Contract Type"}
      description="Configure contract type details and additional information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={contractType || {}}
      isEditing={!!contractType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="code"
        rules={{ required: "Please enter contract type code" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter code"
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
        rules={{ required: "Please enter contract type name" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter name"
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
            <FormLabel>Alternative Code</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter alternative code (optional)"
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
            <FormLabel>Additional Value 1</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter additional value (optional)"
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
            <FormLabel>Additional Value 2</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter additional value (optional)"
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
            <FormLabel>Additional Value 3</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter additional value (optional)"
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

export default ContractTypeForm;
