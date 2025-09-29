// Common Components Index
// This file exports commonly used components for easier importing

// IMPORTANT: Popups should NOT be exported from this barrel file.
// Each popup must be imported directly from its own directory to avoid
// bundling all popups during the publishing process.
// 
// Example:
// import { SomePopup } from '@/common/components/popups/some-popup/SomePopup';
// NOT: import { SomePopup } from '@/common/components';

// Record Sections
export * from './common-relations/record-sections';

// Form Segments - migrated to individual imports
// Import each form segment directly from its specific file:
// import ActivitySegment from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment';
// import TaskSegment from '@/common/components/common-relations/form-segments/task-segment/TaskSegment';
// import NoteSegment from '@/common/components/common-relations/form-segments/note-segment/NoteSegment';
