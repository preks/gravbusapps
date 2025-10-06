import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
} from "@newwork/nw-design-system";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntitySelect } from '../shared/components';

export interface NoteSegmentProps {
  // Entity selection
  showEntitySelection?: boolean;
  entities?: Array<{ id: string; name: string; type: "account" | "contact" | "opportunity" | "lead" }>;
  entitiesLoading?: boolean;
  onEntitySearch?: (searchTerm: string) => void;
  entitiesHasMore?: boolean;
  onEntityLoadMore?: () => void;
  initialEntityFromContext?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string };

  // Labels
  titleLabel: React.ReactNode;
  textLabel: React.ReactNode;
  reminderLabel?: React.ReactNode;
  entityLabel?: React.ReactNode;

  // Placeholders (optional)
  titlePlaceholder?: string;
  textPlaceholder?: string;
  reminderPlaceholder?: string;

  // TestId prefix for container
  ["data-testid"]?: string;
}

export interface NoteSegmentSchema {
  id?: string;
  title: string;
  text: string;
  reminderDate?: string | null;
  relatedEntityId?: string;
  account?: { id: string };
  contact?: { id: string };
  opportunity?: { id: string };
  lead?: { id: string };
  authorEmployee?: { id: string };
  version?: number;
}

export const noteSegmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  text: z.string().min(1, "Note text is required"),
  reminderDate: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

export const createNoteSegmentResolver = () => zodResolver(noteSegmentSchema);

const NoteSegment: React.FC<NoteSegmentProps> = ({
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  entitiesHasMore,
  onEntityLoadMore,
  initialEntityFromContext,
  titleLabel,
  textLabel,
  reminderLabel,
  entityLabel,
  titlePlaceholder,
  textPlaceholder,
  reminderPlaceholder,
  "data-testid": dataTestId = "note-segment",
}) => {
  const form = useFormContext<any>();

  const normalizeDateTimeLocalValue = React.useCallback((v: string | undefined | null) => {
    if (!v) return "";
    const s = v.replace("Z", "");
    return s.length >= 16 ? s.slice(0, 16) : s;
  }, []);

  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch("");
    }
  }, [showEntitySelection, onEntitySearch, entities]);

  React.useEffect(() => {
    if (!showEntitySelection || !initialEntityFromContext) return;
    const hasEntity = Boolean(
      form.getValues("account") || form.getValues("contact") || form.getValues("opportunity") || form.getValues("lead")
    );
    if (hasEntity) return;

    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext;
    const map: Array<{ key: "account" | "contact" | "opportunity" | "lead"; id?: string }> = [
      { key: "account", id: accountId },
      { key: "contact", id: contactId },
      { key: "opportunity", id: opportunityId },
      { key: "lead", id: leadId },
    ];
    const found = map.find((m) => m.id);
    if (found?.id) {
      form.setValue(found.key, { id: found.id });
    }
  }, [showEntitySelection, initialEntityFromContext, form]);

  return (
    <>
      {/* Title */}
      <FormField
        control={form.control as any}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{titleLabel}</FormLabel>
            <FormControl>
              <Input data-testid={`${dataTestId}-title`} maxLength={100} placeholder={titlePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Text */}
      <FormField
        control={form.control as any}
        name="text"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{textLabel}</FormLabel>
            <FormControl>
              <Textarea data-testid={`${dataTestId}-text`} placeholder={textPlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Reminder Date */}
      {reminderLabel && (
        <FormField
          control={form.control as any}
          name="reminderDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{reminderLabel}</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  data-testid={`${dataTestId}-reminder-date`}
                  value={normalizeDateTimeLocalValue(field.value)}
                  onChange={field.onChange}
                  placeholder={reminderPlaceholder}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || "Related Entity"}</FormLabel>
              <FormControl>
                <EntitySelect
                  className="gba:w-full gba:h-auto"
                  entities={entities as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v);
                    const id = String(v || "");
                    const e = (entities || []).find((x) => x.id === id);
                    form.setValue("account", undefined);
                    form.setValue("contact", undefined);
                    form.setValue("opportunity", undefined);
                    form.setValue("lead", undefined);
                    if (e) {
                      form.setValue(e.type, { id: e.id });
                    }
                  }}
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  hasMore={Boolean(entitiesHasMore)}
                  onLoadMore={onEntityLoadMore}
                  data-testid={`${dataTestId}-entity`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};

export default NoteSegment;



