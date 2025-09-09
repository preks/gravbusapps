import React from 'react';
import { Button, Card, CardContent } from '@newwork/nw-design-system';
import { EditOutlined, CloseOutlined, UserOutlined, CalendarOutlined, PlusCircleOutlined, BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppAction } from '@/components/app-action';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';

type NoteItem = {
  id: string;
  noteTitle: string;
  noteText: string;
  createdAt: string;
  createdBy: string;
  assigneeEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string };
  reminderAt?: string | null;
};

interface NoteSectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  demo?: boolean;
  notes?: NoteItem[];
  'data-testid'?: string;
  noteActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
}

const NoteSection: React.FC<NoteSectionProps> = ({ accessToken, accountId, contactId, opportunityId, leadId, notes: notesProp, noteActionProps }) => {
  const defaultNotes: NoteItem[] = [
    {
      id: 'n1',
      noteTitle: 'Kickoff completed',
      noteText: 'Discussed scope and next steps with client',
      createdAt: new Date().toISOString(),
      createdBy: 'Daniel Vorberg',
      assigneeEmployee: { id: 'emp_demo_1', displayName: 'Elena Petrova' },
      reminderAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n2',
      noteTitle: 'Follow-up scheduled',
      noteText: 'Reminder set for Friday 10:00',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: 'You',
      assigneeEmployee: { id: 'emp_demo_2', displayName: 'Mike Krupskii' },
      reminderAt: null,
    },
  ];
  const notes = notesProp && notesProp.length ? notesProp : defaultNotes;

  const externalContextData = noteActionProps?.externalContextData
    || (accountId ? { accountId } : contactId ? { contactId } : opportunityId ? { opportunityId } : leadId ? { leadId } : {});

  return (
    <div className="gba:notes-content" data-testid="note-section">
      <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4">
        <div className="gba:text-lg gba:font-medium">Notes</div>
        <AppAction
          accessToken={accessToken}
          contextsArray={noteActionProps?.contextsArray}
          externalContextData={externalContextData}
          prefixDataTestId={noteActionProps?.prefixDataTestId || 'notes'}
          emptyStateBehavior={noteActionProps?.emptyStateBehavior || 'enable'}
        >
          <Button data-testid="add-note-button"><span className="gba:flex gba:items-center gba:gap-2"><PlusCircleOutlined /> Add Note</span></Button>
        </AppAction>
      </div>

      <div className="gba:px-6 gba:pb-6">
        <div className="gba:flex gba:flex-col gba:space-y-4">
          {notes.map((note: any) => (
            <Card
              key={note.id}
              data-testid={`note-card-${note.id}`}
              className="gba:shadow-sm gba:rounded-xl"
            >
              <CardContent>
                {/* Header row: title + optional reminder pill on the left, icons on the right */}
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-3 min-[480px]:gba:flex-nowrap">
                    <div className="gba:text-lg gba:font-semibold gba:leading-snug">{note.noteTitle}</div>
                    {note.reminderAt && (
                      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:px-3 gba:py-1 gba:rounded-full gba:border gba:whitespace-nowrap" data-testid={`note-reminder-pill-${note.id}`}>
                        <BellOutlined />
                        <span>{dayjs(note.reminderAt).format('MMM D, YYYY [at] h:mm A')}</span>
                      </span>
                    )}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-3 gba:shrink-0">
                    <AppAction
                      accessToken={accessToken}
                      contextsArray={noteActionProps?.contextsArray}
                      externalContextData={{ ...externalContextData, noteId: note.id }}
                      prefixDataTestId={noteActionProps?.prefixDataTestId ? `${noteActionProps?.prefixDataTestId}-edit` : 'notes-edit'}
                      emptyStateBehavior={noteActionProps?.emptyStateBehavior || 'enable'}
                    >
                      <span
                        aria-label="Edit note"
                        data-testid={`edit-note-action-${note.id}`}
                        className="gba:inline-flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1"
                      >
                        <EditOutlined />
                      </span>
                    </AppAction>
                    <AppAction
                      accessToken={accessToken}
                      contextsArray={noteActionProps?.contextsArray}
                      externalContextData={{ ...externalContextData, noteId: note.id }}
                      prefixDataTestId={noteActionProps?.prefixDataTestId ? `${noteActionProps?.prefixDataTestId}-delete` : 'notes-delete'}
                      emptyStateBehavior={noteActionProps?.emptyStateBehavior || 'enable'}
                    >
                      <span
                        aria-label="Delete note"
                        data-testid={`delete-note-action-${note.id}`}
                        className="gba:inline-flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1"
                      >
                        <CloseOutlined />
                      </span>
                    </AppAction>
                  </div>
                </div>

                {/* Body text */}
                <div className="gba:mt-2">{note.noteText}</div>

                {/* Footer row: assignee link + created date; single line until wrap is required */}
                <div className="gba:mt-4 gba:flex gba:flex-wrap gba:items-center gba:justify-start gba:text-xs gba:gap-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
                    <UserOutlined />
                    {note.assigneeEmployee?.id ? (
                      <button
                        type="button"
                        onClick={() => navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId: note.assigneeEmployee?.id as string }))}
                        className="gba:underline gba:whitespace-nowrap"
                        data-testid={`note-assignee-link-${note.assigneeEmployee.id}`}
                      >
                        {note.assigneeEmployee.displayName || `${note.assigneeEmployee.firstName || ''} ${note.assigneeEmployee.lastName || ''}`.trim()}
                      </button>
                    ) : (
                      <span>{note.assigneeEmployee?.displayName || note.createdBy}</span>
                    )}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
                    <CalendarOutlined />
                    <span>{dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NoteSection;


