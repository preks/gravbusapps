/**
 * Event names used across personal-expenses tabs to refresh lists after process / task completion.
 * Keep in sync with platform process event dispatching.
 */
export const PROCESS_COMPLETION_EVENT_NAMES: readonly string[] = [
  'com.newwork.process.taskCompletion',
  'com.newwork.process.completion',
  'com.newwork.process.continue',
  'com.newwork.process.processCompletion',
  'processCompletion',
  'taskCompletion',
  'taskCompleted',
  'processCompleted',
  'task-completion',
  'process-completion'
]
