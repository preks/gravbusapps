import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button, Timeline, Typography, message, Modal, Input } from 'antd';
import { NoteDeletionPopup } from '@/common/components';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
// import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentNotesByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import type { InvestmentNote } from '@/common/data/investment/types';

const { TextArea } = Input;
const { Text } = Typography;

interface NotesSectionProps {
  leadId?: string;
  context: BusinessAppContextProps;
  showHeader?: boolean;
}

// Use the actual investment note type
type SimpleNoteData = InvestmentNote;

export const NotesSection: React.FC<NotesSectionProps> = ({ leadId, context, showHeader = true }) => {
  const [notes, setNotes] = useState<SimpleNoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SimpleNoteData | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  // const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  const { fetchInvestmentNotesByLeadId } = useGetInvestmentNotesByLeadId(context);

  const loadNotes = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const notesData = await fetchInvestmentNotesByLeadId(leadId);
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [leadId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window gained focus, refreshing notes...');
      loadNotes();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [leadId]);

  // Listen for process completion events to refresh notes
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadNotes();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success') {
          loadNotes();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('note'))) {
        console.log('Detected process/note event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names
    const eventNames = [
      'com.newwork.process.noteCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'processCompletion',
      'noteCompletion',
      'noteCompleted',
      'processCompleted'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    // Add a universal listener for debugging
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('note'))) {
        console.log('Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [leadId]);

  // const handleAddNoteClick = () => {
  //   setEditingNote(null);
  //   setNoteTitle('');
  //   setNoteText('');
  //   setIsModalVisible(true);
  // };

  const handleEditNote = (note: SimpleNoteData) => {
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteText(note.text || '');
    setIsModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteText.trim()) {
      message.error('Please fill in both title and text');
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        // Update existing note
        await restClient.post('/investments/saveInvestmentNote', { // Updated from '/customer-relations/saveCrmNote'
          changeMode: "UPDATE",
          investmentNote: { // Updated from 'crmNote'
            id: editingNote.id,
            title: noteTitle.trim(),
            text: noteText.trim(),
            version: editingNote.version || 1
          }
        });
        message.success('Note updated successfully');
      } else {
        // Create new note
        await restClient.post('/investments/saveInvestmentNote', { // Updated from '/customer-relations/saveCrmNote'
          changeMode: "CREATE",
          investmentNote: { // Updated from 'crmNote'
            title: noteTitle.trim(),
            text: noteText.trim(),
            leadId: leadId
          }
        });
        message.success('Note created successfully');
      }
      
      setIsModalVisible(false);
      loadNotes(); // Refresh the list
    } catch (err) {
      console.error('Error saving note:', err);
      message.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const [deletePopup, setDeletePopup] = useState<{ open: boolean; note?: SimpleNoteData }>({ open: false });
  const handleDeleteNote = (note: SimpleNoteData) => {
    setDeletePopup({ open: true, note });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteText('');
  };

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Notes"
        description={error}
        type="error"
        showIcon
        className="gba:mb-4"
        action={
          <Button size="small" onClick={loadNotes}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="gba:space-y-4">
      {/* Header - Only show if showHeader is true */}
      {showHeader && (
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Notes</h3>
            <p className="gba:text-sm gba:text-gray-600">
              Keep track of important information and observations about this investment lead
            </p>
          </div>
          <AppAction
            contextsArray={[FlowContextName.investmentNoteEntity]}
            externalContextData={{
              leadId,
              lead: leadId,
              investmentNote: { lead: leadId }
            }}
            staticFlowData={leadId ? [{
              key: 'create-investment-note-fallback',
              label: 'Add Note',
              onClick: () => startProcess({
                domain: 'investments',
                processName: 'createInvestmentNote',
                payload: { leadId },
                builderType: 'NATIVE_SCREEN'
              })
            }] : []}
            prefixDataTestId="add-note"
            accessToken={context.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              className="gba:bg-blue-600 gba:hover:bg-blue-700"
            >
              Add Note
            </Button>
          </AppAction>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="gba:text-center gba:py-8 gba:text-gray-500">
          <p>No notes found for this investment lead.</p>
          <p className="gba:text-sm">Create a new note to get started.</p>
        </div>
      ) : (
        <Timeline>
          {notes.map((note) => (
            <Timeline.Item key={note.id} className="gba:pb-6">
              <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:shadow-sm">
                <div className="gba:flex gba:justify-between gba:items-start gba:mb-3">
                  <div className="gba:flex-1">
                    <Text strong className="gba:text-base gba:block gba:mb-2">
                      {note.title || 'Untitled Note'}
                    </Text>
                    
                    <Text className="gba:text-gray-600 gba:block gba:mb-3">
                      {note.text}
                    </Text>
                    
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-gray-500">
                                             {note.authorDisplayName && (
                         <span className="gba:flex gba:items-center gba:gap-1">
                           <UserOutlined />
                           By: {note.authorDisplayName}
                         </span>
                       )}
                      
                      <span>
                        Created: {dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="gba:flex gba:gap-2 gba:ml-4">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditNote(note)}
                      className="gba:text-blue-600 gba:border-blue-600 gba:hover:text-blue-700 gba:hover:border-blue-700"
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleDeleteNote(note)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      {/* Add/Edit Note Modal */}
      <Modal
        title={editingNote ? 'Edit Note' : 'Add Note'}
        open={isModalVisible}
        onOk={handleSaveNote}
        onCancel={handleModalCancel}
        confirmLoading={saving}
        okText={editingNote ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={600}
      >
        <div className="gba:space-y-4">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
              Title
            </label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Enter note title"
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
              Note Text
            </label>
            <TextArea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note content"
              rows={6}
              maxLength={1000}
              showCount
            />
          </div>
        </div>
      </Modal>

      {deletePopup.open && deletePopup.note && (
        <NoteDeletionPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          noteId={deletePopup.note.id}
          noteVersion={deletePopup.note.version}
          noteTitle={deletePopup.note.title || 'Untitled Note'}
          domain="investments"
          onSuccess={() => {
            const id = deletePopup.note!.id;
            setNotes(prev => prev.filter(n => n.id !== id));
            setDeletePopup({ open: false });
          }}
          onError={() => setDeletePopup({ open: false })}
        />
      )}
    </div>
  );
}; 