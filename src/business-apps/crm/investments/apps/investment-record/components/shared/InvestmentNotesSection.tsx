import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button, Timeline, Typography, message, Modal, Input } from 'antd';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { formatDate } from '@/common/data/investment';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { useGetInvestmentNotesByInvestmentId } from '../../hooks/useInvestmentNotesByInvestmentId';
import type { InvestmentNote } from '@/common/data/investment/types';


const { TextArea } = Input;
const { Text } = Typography;

interface InvestmentNotesSectionProps {
  investmentId?: string;
  context: BusinessAppContextProps;
  showHeader?: boolean;
}

// Use the actual investment note type
type SimpleNoteData = InvestmentNote;

export const InvestmentNotesSection: React.FC<InvestmentNotesSectionProps> = ({ investmentId, context, showHeader = true }) => {
  const [notes, setNotes] = useState<SimpleNoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SimpleNoteData | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId(context);

  const loadNotes = async () => {
    if (!investmentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const notesData = await fetchInvestmentNotesByInvestmentId(investmentId);
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [investmentId]);

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
        console.error('Error handling process completion in NotesSection:', err);
      }
    };

    // Listen to multiple possible event names for note updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [investmentId]);

  // Use central formatDate function with custom format for notes
  const formatNoteDate = (dateString: string | null | undefined): string => {
    return formatDate(dateString, 'DD.MM.YYYY HH:mm', 'N/A');
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteText('');
    setIsModalVisible(true);
  };

  const openEditModal = (note: SimpleNoteData) => {
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteText(note.text || '');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteText('');
  };

  const saveNote = async () => {
    if (!investmentId) {
      message.error('Investment ID is required');
      return;
    }

    if (!noteTitle.trim() && !noteText.trim()) {
      message.error('Please enter a title or note text');
      return;
    }

    setSaving(true);
    
    try {
      const processKey = editingNote ? 'investment-note-update' : 'investment-note-create';
      const payload = editingNote 
        ? {
            id: editingNote.id,
            version: editingNote.version,
            title: noteTitle.trim(),
            text: noteText.trim(),
            investmentId: investmentId,
          }
        : {
            title: noteTitle.trim(),
            text: noteText.trim(),
            investmentId: investmentId,
          };

      await startProcess(processKey, payload);
      
      message.success(editingNote ? 'Note updated successfully' : 'Note created successfully');
      closeModal();
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      message.error(editingNote ? 'Failed to update note' : 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    if (!investmentId) {
      message.error('Investment ID is required to create a note');
      return;
    }

    try {
      await startProcess('investment-note-create', {
        investmentId: investmentId,
      });
      message.success('Note creation process started');
    } catch (error) {
      console.error('Error starting note creation process:', error);
      message.error('Failed to start note creation process');
    }
  };

  const renderContent = () => {
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
          action={
            <Button size="small" onClick={loadNotes}>
              Retry
            </Button>
          }
          style={{ margin: '16px 0' }}
        />
      );
    }

    if (notes.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          <EditOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No notes found</p>
          <p style={{ fontSize: '14px' }}>Notes related to this investment will appear here</p>
        </div>
      );
    }

    return (
      <Timeline mode="left" style={{ marginTop: '16px' }}>
        {notes.map((note) => (
          <Timeline.Item
            key={note.id}
            dot={<EditOutlined />}
            color="blue"
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>
                    {note.title || 'Untitled Note'}
                  </h4>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatNoteDate(note.createdAt)} • {getEmployeeDisplayName(note.authorEmployee?.id)}
                  </Text>
                  {note.reminderDate && (
                    <Text type="warning" style={{ fontSize: '12px', marginLeft: '16px' }}>
                      Reminder: {formatNoteDate(note.reminderDate)}
                    </Text>
                  )}
                </div>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(note)}
                  style={{ marginLeft: '8px' }}
                  data-testid={`edit-note-${note.id}`}
                />
              </div>
              {note.text && (
                <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  {note.text}
                </p>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  return (
    <div data-testid="investment-notes-section">
      {showHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Notes ({notes.length})
          </h3>
          <Button
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={openCreateModal}
            data-testid="investment-create-note-button"
          >
            Add Note
          </Button>
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Create/Edit Modal */}
      <Modal
        title={editingNote ? 'Edit Note' : 'Create Note'}
        open={isModalVisible}
        onOk={saveNote}
        onCancel={closeModal}
        okText={editingNote ? 'Update' : 'Create'}
        cancelText="Cancel"
        confirmLoading={saving}
        data-testid="investment-note-modal"
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Title
          </label>
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Enter note title..."
            data-testid="note-title-input"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Note
          </label>
          <TextArea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter your note..."
            rows={6}
            data-testid="note-text-input"
          />
        </div>
      </Modal>
    </div>
  );
};

export default InvestmentNotesSection;
