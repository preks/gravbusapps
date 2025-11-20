import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Textarea } from '@newwork/nw-design-system'
import { PiNote } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface NotesSectionProps {
  description?: string
  prefixDataTestId?: string
}

const NotesSection: React.FC<NotesSectionProps> = ({ description, prefixDataTestId = 'approve-expense' }) => {
  if (!description) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-notes`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiNote className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.notes_area_label', 'Notes')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.notes_area_placeholder',
            'No Notes'
          )}
          value={description}
          disabled
          className="gba:resize-none gba:min-h-[80px]"
          data-testid={`${prefixDataTestId}-notes-textarea`}
        />
      </CardContent>
    </Card>
  )
}

export default NotesSection
