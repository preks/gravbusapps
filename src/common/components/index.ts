// Common Components Index
// This file exports commonly used components for easier importing

// Delete Confirmation Popup
export { 
  DeleteConfirmationPopup, 
  useDeleteConfirmation,
  type DeleteConfirmationPopupProps 
} from './popups/delete-confirmation-popup';

// Activity Deletion Popup (Flow-configured wrapper)
export { 
  ActivityDeletionPopup,
  type ActivityDeletionPopupProps
} from './popups/activity-deletion-popup';

// Record Sections
export * from './common-relations/record-sections';

// Form Segments  
export * from './common-relations/form-segments';
