import { useState, useEffect } from 'react';

interface KeyboardShortcutsOptions {
  [key: string]: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcutsOptions = {}) => {
  const [helpVisible, setHelpVisible] = useState<boolean>(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const alt = e.altKey;
      const shift = e.shiftKey;
      const ctrl = e.ctrlKey;
      
      // Toggle help dialog with '?' key or Ctrl+H
      if ((key === '?' || (key === 'h' && ctrl)) && !alt && !shift) {
        e.preventDefault();
        setHelpVisible(prev => !prev);
        return;
      }
      
      // Check for shortcut combinations
      for (const shortcut in shortcuts) {
        const parts = shortcut.toLowerCase().split('+');
        const mainKey = parts[parts.length - 1];
        const needsShift = parts.includes('shift');
        const needsCtrl = parts.includes('ctrl');
        const needsAlt = parts.includes('alt');
        
        if (
          key === mainKey &&
          (!needsShift || shift) &&
          (!needsCtrl || ctrl) &&
          (!needsAlt || alt)
        ) {
          e.preventDefault();
          shortcuts[shortcut]();
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
  
  return { helpVisible, setHelpVisible };
};
