import React, { useState, useEffect, SetStateAction, Dispatch } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  Button,
  Form,
  DialogTitle,
} from "@newwork/nw-design-system";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/common/utils/cn";

interface FormWrapperModalProps {
  childAddButton?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
  onSubmit?: (_data: Record<string, string | undefined> | undefined) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Record<string, string>;
  isEditing?: boolean;
  loading?: boolean;
  dataTestId?: string;
  isDrawerActive?: boolean;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  isValid?: boolean;
  setCodeError?: Dispatch<SetStateAction<string>>;
}

const FormWrapperModal = ({
  childAddButton,
  children,
  title = "Form",
  description,
  onSubmit,
  onCancel,
  defaultValues = {},
  isEditing = false,
  loading = false,
  isDrawerActive = false,
  dataTestId = "form-wrapper-modal",
  open,
  setOpen,
  isValid = true,
  setCodeError,
}: FormWrapperModalProps) => {
  const [isOpen, setIsOpen] = useState(open);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
    form.clearErrors();
  }, [form, defaultValues]);

  const handleSubmit = async (data: Record<string, string>) => {
    if (!onSubmit) return;

    setIsSubmitting(true);

    try {
      await onSubmit(data);

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);

      const defaultErrorMessage = "Something went wrong";
      const errorMsg = error instanceof Error ? error.message : defaultErrorMessage;
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setOpen?.(false);
    setCodeError?.("");
    form.reset();
    if (onCancel) {
      onCancel();
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setOpen?.(open);
    setCodeError?.("");
    if (!open) {
      form.reset();
      if (onCancel) {
        onCancel();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {childAddButton && <DialogTrigger asChild>{childAddButton}</DialogTrigger>}
      <DialogContent data-testid={dataTestId} className={cn({ "gba:!z-[1002]": isDrawerActive })}>
        <DialogTitle>{title}</DialogTitle>
        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            {description && <p className="gba:text-sm gba:text-muted-foreground">{description}</p>}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-4">
              {children}

              <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
                <Button
                  type="submit"
                  disabled={loading || isSubmitting || !isValid}
                  data-testid={`${dataTestId}-submit-button`}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  data-testid={`${dataTestId}-cancel-button`}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormWrapperModal;
