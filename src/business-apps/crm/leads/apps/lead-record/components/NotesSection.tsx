import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Spin, Alert, Empty, Timeline, Typography, message } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetCrmNotes, CrmNoteData } from '../queries/CrmNoteQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface NotesSectionProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ leadId, context }) => {
  const [notes, setNotes] = useState<CrmNoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchCrmNotes } = useGetCrmNotes(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const loadNotes = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchCrmNotes({ leadId });
      // Sort notes by createdAt in descending order (newest first)
      const sortedNotes = (result.CrmNote || []).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotes(sortedNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [leadId]);

  // Listen for process completion events to refresh notes
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        const response = event.detail?.response;
        if (response?.crmNote) {
          // Refresh notes when a new note is added
          loadNotes();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener);

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener);
    };
  }, [leadId]);

  const handleDeleteNote = async (note: CrmNoteData) => {
    try {
      await restClient.post('/customer-relations/saveCrmNote', {
        changeMode: "DELETE",
        crmNote: {
          id: note.id,
          version: note.version,
          lead: leadId
        }
      }, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      });
      
      // Remove the note from the local state
      setNotes(prevNotes => 
        prevNotes.filter(n => n.id !== note.id)
      );
      
      message.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Failed to delete note');
    }
  };

  const handleAddNote = () => {
    if (leadId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmNote',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleRefresh = () => {
    loadNotes();
  };

  return (
    <div className="gba:notes-content" data-testid="notes-content">
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}
      >
        <div 
          className="gba:notes-title" 
          style={{ fontSize: '18px', fontWeight: '500' }}
        >
          Notes
        </div>
        <Button 
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={handleAddNote}
          data-testid="add-note-button"
        >
          Add Note
        </Button>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message="Error Loading Notes"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            action={
              <Button size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && notes.length === 0 && (
          <Empty
            description="No notes yet"
            style={{ padding: '40px 0' }}
            data-testid="empty-notes"
          >
            <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
              Start by adding your first note
            </div>
          </Empty>
        )}

        {!loading && !error && notes.length > 0 && (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={note.id || index} color="blue">
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{note.noteTitle}</Text>
                  </div>
                  <div><Text type="secondary">{dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')}</Text></div>
                  <div style={{ marginTop: '4px' }}>
                    <div>{note.noteText}</div>
                  </div>
                  <Button 
                    type="text" 
                    icon={<CloseOutlined />} 
                    size="small"
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: 0,
                      padding: '4px',
                      lineHeight: 1
                    }}
                    onClick={() => handleDeleteNote(note)}
                    data-testid={`delete-note-${note.id}`}
                  />
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>
    </div>
  );
}; 