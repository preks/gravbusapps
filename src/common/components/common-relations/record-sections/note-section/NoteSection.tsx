import React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { UserOutlined, CalendarOutlined, PlusCircleOutlined, BellOutlined, MoreOutlined } from '@ant-design/icons';
import { PlusCircleIcon } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { AppAction } from '@/components/app-action';
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';

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
  noteEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
}

const NoteSection: React.FC<NoteSectionProps> = ({ accessToken, accountId, contactId, opportunityId, leadId, notes: notesProp, noteActionProps, noteEntityActionProps }) => {
  const notes = notesProp || [];

  const externalContextData = noteActionProps?.externalContextData
    || (accountId ? { accountId } : contactId ? { contactId } : opportunityId ? { opportunityId } : leadId ? { leadId } : {});

  return (
    <Card data-testid="note-section">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0">
        <CardTitle>Notes</CardTitle>
        <AppAction
          accessToken={accessToken}
          contextsArray={noteActionProps?.contextsArray}
          externalContextData={externalContextData}
          prefixDataTestId={noteActionProps?.prefixDataTestId || 'notes'}
          emptyStateBehavior={noteActionProps?.emptyStateBehavior || 'enable'}
        >
          <Button data-testid="add-note-button" size="icon"><PlusCircleIcon /></Button>
        </AppAction>
      </CardHeader>

      <CardContent>
        {notes.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>No notes available</p>
          </div>
        ) : (
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
                    {noteEntityActionProps ? (
                      <AppActionMenu
                        accessToken={accessToken}
                        contextsArray={noteEntityActionProps.contextsArray}
                        externalContextData={{ ...noteEntityActionProps.externalContextData, noteId: note.id }}
                        prefixDataTestId={noteEntityActionProps.prefixDataTestId ? `${noteEntityActionProps.prefixDataTestId}-${note.id}` : `note-actions-${note.id}`}
                        emptyStateBehavior={noteEntityActionProps.emptyStateBehavior || 'enable'}
                        deferMainContextRequestsUntilClick={true}
                        data-testid={`note-actions-menu-${note.id}`}
                      >
                        <span
                          aria-label="Note actions"
                          className="gba:inline-flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1 gba:rounded hover:gba:bg-gray-100"
                          data-testid={`note-actions-trigger-${note.id}`}
                        >
                          <MoreOutlined className="gba:rotate-90" />
                        </span>
                      </AppActionMenu>
                    ) : (
                      // Fallback to legacy behavior if noteEntityActionProps not provided
                      <span className="gba:text-gray-400 gba:text-sm">No actions available</span>
                    )}
                  </div>
                </div>

                {/* Body text */}
                <div className="gba:mt-2">{note.noteText}</div>

                {/* Footer row: assignee link + created date; single line until wrap is required */}
                <div className="gba:mt-4 gba:flex gba:flex-wrap gba:items-center gba:justify-start gba:text-xs gba:gap-6">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
                    <UserOutlined />
                    {note.assigneeEmployee?.id ? (
                      <a
                        href={buildPlatformUrl('/platform/employee-record', { employeeId: note.assigneeEmployee?.id as string })}
                        className="gba:underline gba:whitespace-nowrap gba:text-inherit hover:gba:text-primary"
                        data-testid={`note-assignee-link-${note.assigneeEmployee.id}`}
                      >
                        {note.assigneeEmployee.displayName || `${note.assigneeEmployee.firstName || ''} ${note.assigneeEmployee.lastName || ''}`.trim()}
                      </a>
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
        )}
      </CardContent>
    </Card>
  );
};

export default NoteSection;


