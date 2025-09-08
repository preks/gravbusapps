import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Input,
  Textarea,
  Spinner,
} from "@newwork/nw-design-system";
import { useFormContext } from "react-hook-form";
import { useCatalogOptions } from "../../shared/hooks/useCatalogOptions";

interface Props {
  legalFormLabel?: React.ReactNode;
  industryLabel?: React.ReactNode;
  websiteLabel?: React.ReactNode;
  descriptionLabel?: React.ReactNode;
  accessToken?: string;
  // Catalogs/options
  legalFormOptions?: Array<{ value: string; label: string }>;
  legalFormCatalog?: { identifier: string; version: string };
  fetchLegalFormOptions?: (q?: string) => Promise<Array<{ value: string; label: string }>>;
  industryOptions?: Array<{ value: string; label: string }>;
  industryCatalog?: { identifier: string; version: string };
  fetchIndustryOptions?: (q?: string) => Promise<Array<{ value: string; label: string }>>;
}

const CompanyInfoSegment: React.FC<Props> = ({
  legalFormLabel,
  industryLabel,
  websiteLabel,
  descriptionLabel,
  accessToken,
  legalFormOptions,
  legalFormCatalog,
  fetchLegalFormOptions,
  industryOptions,
  industryCatalog,
  fetchIndustryOptions,
}) => {
  const form = useFormContext<any>();

  const legalFormState = useCatalogOptions({
    accessToken,
    catalog: legalFormCatalog,
    providedOptions: legalFormOptions,
    fetchOptions: fetchLegalFormOptions,
  });
  const industryState = useCatalogOptions({
    accessToken,
    catalog: industryCatalog,
    providedOptions: industryOptions,
    fetchOptions: fetchIndustryOptions,
  });

  return (
    <>
      {/* Legal Form + Industry */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {legalFormLabel && (
          <FormField
            control={form.control as any}
            name="legalFormRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{legalFormLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="account-segment-legal-form">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {legalFormState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {legalFormState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {industryLabel && (
          <FormField
            control={form.control as any}
            name="industryRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{industryLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="account-segment-industry">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industryState.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industryState.loading && <Spinner size="sm" />}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Website + Description */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {websiteLabel && (
          <FormField
            control={form.control as any}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{websiteLabel}</FormLabel>
                <FormControl>
                  <Input data-testid="account-segment-website" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {descriptionLabel && (
          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{descriptionLabel}</FormLabel>
                <FormControl>
                  <Textarea data-testid="account-segment-description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </>
  );
};

export default CompanyInfoSegment;


