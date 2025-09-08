import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from "@newwork/nw-design-system";
import { useFormContext } from "react-hook-form";

interface Props {
  phoneLabel?: React.ReactNode;
  emailLabel?: React.ReactNode;
}

const ContactInfoSegment: React.FC<Props> = ({ phoneLabel, emailLabel }) => {
  const form = useFormContext<any>();

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
      {/* Phone */}
      {phoneLabel && (
        <FormField
          control={form.control as any}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{phoneLabel}</FormLabel>
              <FormControl>
                <Input data-testid="account-segment-phone" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Email */}
      {emailLabel && (
        <FormField
          control={form.control as any}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" data-testid="account-segment-email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default ContactInfoSegment;


