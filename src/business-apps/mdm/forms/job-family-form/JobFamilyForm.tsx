import React from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import FormWrapperModal from "@/business-apps/mdm/apps/generic-components/form-wrapper/FormWrapperModal";
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
} from "@newwork/nw-design-system";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import {
  JOB_FAMILY_CATALOG,
  JOB_FAMILY_VERSION,
} from "@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/hooks/useJobFamilyFilters";
export interface JobFamily {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  children?: JobFamily[];
}

export interface JobFamilyFormProps extends BusinessAppContextProps {
  childAddButton?: React.ReactNode;
  jobFamily?: Partial<JobFamily>;
  onCancel?: () => void;
  selectedParentId?: string | null;
  selectedParentName?: string;
  prefixDataTestId: string;
  loading?: boolean;
  refetch: () => void;
  isDrawerActive?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const JobFamilyForm: React.FC<JobFamilyFormProps> = ({
  childAddButton,
  jobFamily,
  onCancel,
  selectedParentId,
  selectedParentName,
  prefixDataTestId,
  loading = false,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
}) => {
  const catalogClient = useCatalogManagerClient(accessToken);

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...(jobFamily ? { id: jobFamily.id } : {}),
        code: values.code,
        value: values.name,
        additionalValue1: values.description,
        translations: [],
      };

      if (jobFamily) {
        await catalogClient.updateCatalogEntry(jobFamily.id ?? "", payload);
      } else {
        await catalogClient.createCatalogEntry(
          JOB_FAMILY_CATALOG,
          JOB_FAMILY_VERSION,
          payload
        );
      }

      refetch();
    } catch (error) {
      console.error("Error saving Job Family:", error);
    } finally {
      setOpen?.(false);
    }
  };

  const defaultValues = jobFamily
    ? {
        name: jobFamily.name || "",
        code: jobFamily.code || "",
        description: jobFamily.description || "",
      }
    : {};

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobFamily ? "Edit Job Family" : "Create Job Family"}
      description={
        jobFamily
          ? "Update the job family information"
          : "Create a new job family to organize related job roles"
      }
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!jobFamily}
      loading={loading}
      dataTestId={`${prefixDataTestId}-form-modal`}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
    >
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Engineering, Sales, Marketing"
                {...field}
                data-testid={`${prefixDataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., ENG, SALES, MKT"
                {...field}
                data-testid={`${prefixDataTestId}-code-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe this job family and the types of roles it contains"
                rows={3}
                {...field}
                data-testid={`${prefixDataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedParentId && (
        <FormField
          name="parentFamily"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Family</FormLabel>
              <FormControl>
                <Input
                  value={selectedParentName || "Unknown"}
                  disabled
                  placeholder="This will be a child of the selected family"
                  data-testid={`${prefixDataTestId}-parent-family-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </FormWrapperModal>
  );
};

export default JobFamilyForm;
