import React from 'react';
import { Textarea } from '@newwork/nw-design-system';
import  { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface NotesSectionProps {
  description?: string;
  prefixDataTestId?: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ 
  description, 
  prefixDataTestId = 'approve-expense' 
}) => {
  return (
    <div 
      className="gba:mb-4 gba:bg-gray-100 gba:p-2 gba:rounded-sm gba:w-full" 
      data-testid={`${prefixDataTestId}-notes`}
    >
      <div className="gba:text-sm gba:font-semibold gba:mb-1 gba:text-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.notes_area_placeholder', 'No Notes')}
      </div>
      <Textarea
        placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.notes_area_placeholder', 'No Notes')}
        value={description || ''}
        disabled
        className="gba:bg-transparent gba:border-none gba:text-muted-foreground gba:resize-none gba:p-0 gba:text-xs"
        data-testid={`${prefixDataTestId}-notes-textarea`}
      />
    </div>
  );
};

export default NotesSection; 