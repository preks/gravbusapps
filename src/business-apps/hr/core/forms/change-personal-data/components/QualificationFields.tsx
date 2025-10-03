import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, Button, Textarea } from '@newwork/nw-design-system';
import type { Control } from 'react-hook-form';
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils';
import { XCircleIcon } from 'lucide-react';

export interface QualificationFieldsProps {
  control: Control<any>;
  catalogs: {
    schoolQualification?: any[];
    academicTitle?: any[];
  };
}

const QualificationFields: React.FC<QualificationFieldsProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select');
  const placeholderEnter = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter');

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-qualification-fields">
      {/* Highest School Qualification */}
      <FormField
        control={control}
        name={"schoolQualificationRef" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-school-qualification-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.qualification', 'Highest School Qualification')}
            </FormLabel>
            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
              <FormControl className="gba:w-[100%]">
                <SelectTrigger data-testid="change-personal-data-school-qualification-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.schoolQualification || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={entry.id} data-testid={`change-personal-data-school-qualification-option-${entry.id}`}>
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Academic Titles multi */}
      <FormField
        control={control}
        name={"academicTitleRefs" as any}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value) ? field.value : [];
          const addValue = (val: string) => {
            if (!val) return;
            if (selected.includes(val)) return;
            field.onChange([...(selected || []), val]);
          };
          const removeValue = (val: string) => {
            field.onChange((selected || []).filter((id: string) => id !== val));
          };
          const selectedEntries = (catalogs.academicTitle || []).filter((e: any) => selected.includes(e.id));
          const triggerText = selectedEntries.length > 0 ? selectedEntries.map((e: any) => getCatalogValue(e)).join(', ') : placeholderSelect;
          return (
            <FormItem>
              <FormLabel data-testid="change-personal-data-academic-titles-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.academic_titles', 'Academic Titles')}
              </FormLabel>
              <Select value={''} onValueChange={(v) => addValue(v)}>
                <FormControl className="gba:w-[100%]">
                  <SelectTrigger data-testid="change-personal-data-academic-titles-select">
                    <SelectValue placeholder={triggerText} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(catalogs.academicTitle || []).map((entry: any) => (
                    <SelectItem key={entry.id} value={entry.id} data-testid={`change-personal-data-academic-title-option-${entry.id}`}>
                      {getCatalogValue(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEntries.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="change-personal-data-academic-titles-chips">
                  {selectedEntries.map((e: any) => (
                    <Badge key={e.id} variant="secondary" className="gba:flex gba:items-center" data-testid={`change-personal-data-academic-title-chip-${e.id}`}>
                      <span className="gba:px-2">
                        {getCatalogValue(e)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeValue(e.id)}
                        aria-label="Remove"
                        className="gba:!px-2"
                        data-testid={`change-personal-data-academic-title-remove-${e.id}`}
                      >
                        <XCircleIcon className="gba:w-4 gba:h-4" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />

      {/* Comment */}
      <FormField
        control={control}
        name={"comment" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-comment-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Comment')}
            </FormLabel>
            <FormControl>
              <Textarea {...field} placeholder={placeholderEnter} rows={4} data-testid="change-personal-data-comment-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default QualificationFields;


