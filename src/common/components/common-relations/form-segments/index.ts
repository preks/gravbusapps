export { default as ActivitySegment } from './activity-segment/ActivitySegment';
export type {
  ActivitySegmentProps,
  ActivityTypeOption,
  Activity,
  EntityOption,
  ActivitySegmentSchema,
} from './activity-segment/ActivitySegment';
export { activitySegmentSchema, createActivitySegmentResolver } from './activity-segment/ActivitySegment';

export { validateActivityData, mapEntityToOption } from './activity-segment/utils';

export { default as TaskSegment } from './task-segment/TaskSegment';
export type { TaskSegmentProps, TaskOption, TaskSegmentSchema } from './task-segment/TaskSegment';
//export { taskSegmentSchema, createTaskSegmentResolver } from './task-segment/TaskSegment';

export { default as NoteSegment } from './note-segment/NoteSegment';
export type { NoteSegmentProps, NoteSegmentSchema } from './note-segment/NoteSegment';
export { noteSegmentSchema, createNoteSegmentResolver } from './note-segment/NoteSegment';

export { useCatalogOptions } from './shared/hooks/useCatalogOptions';

