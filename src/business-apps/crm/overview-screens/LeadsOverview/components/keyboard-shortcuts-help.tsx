import React from 'react';
import { Modal, Typography, Divider } from 'antd';

const { Title, Text } = Typography;

interface ShortcutItem {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts?: ShortcutItem[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
  shortcuts = []
}) => {
  const defaultShortcuts: ShortcutItem[] = [
    { key: '?', description: 'Show/hide keyboard shortcuts help' },
    { key: 'Ctrl+H', description: 'Show/hide keyboard shortcuts help (alternative)' },
    { key: 'Esc', description: 'Close dialogs or cancel current action' }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  return (
    <Modal
      title="Keyboard Shortcuts"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      data-testid="keyboard-shortcuts-help"
    >
      <div className="gba:keyboard-shortcuts-container">
        <Title level={5}>Navigation & Actions</Title>
        <div className="gba:shortcuts-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr',
          gap: '8px 16px' 
        }}>
          {allShortcuts.map((shortcut, index) => (
            <React.Fragment key={index}>
              <div className="gba:shortcut-key" style={{ 
                fontFamily: 'monospace', 
                padding: '4px 8px', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                display: 'inline-block'
              }}>
                {shortcut.key}
              </div>
              <div className="gba:shortcut-description">
                <Text>{shortcut.description}</Text>
              </div>
            </React.Fragment>
          ))}
        </div>
        <Divider />
        <Text type="secondary">
          Note: Some shortcuts may not work if a text field is focused.
          Press Escape to blur the current field before using shortcuts.
        </Text>
      </div>
    </Modal>
  );
};
