import React from 'react';
import { Textarea } from '@newwork/nw-design-system';

interface NotesSectionProps {
  description?: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ description }) => {
  return (
    <div 
      className="gba:mb-4 gba:bg-gray-100 gba:p-2 gba:rounded-sm gba:w-full" 
      data-testid="approve-expense-plan-notes"
    >
      <div className="gba:text-sm gba:font-semibold gba:mb-1 gba:text-foreground">
        Notes
      </div>
      <Textarea
        placeholder="No notes"
        value={description || ''}
        disabled
        className="gba:bg-transparent gba:border-none gba:text-muted-foreground gba:resize-none gba:p-0 gba:text-xs"
        data-testid="approve-expense-plan-notes-textarea"
      />
    </div>
  );
};

export default NotesSection; 