// Shared save/trigger wrappers for workforce config section stacks.

import type { WorkforceAgentUpdateInput, WorkforceTriggerUpdateInput } from './workforceTypes'

export function makeSwallowingSaver(
  saveSection: (section: string, patch: WorkforceAgentUpdateInput) => Promise<void>
): (section: string) => (patch: WorkforceAgentUpdateInput) => Promise<void> {
  return section => async patch => {
    try {
      await saveSection(section, patch)
    } catch {
      // intentionally swallowed — surfaced via parent error state
    }
  }
}

export async function swallowAsync(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch {
    // captured upstream
  }
}

export function wrapTriggerUpdate(
  updateTrigger: (triggerId: string, patch: WorkforceTriggerUpdateInput) => Promise<void>
): (triggerId: string, patch: WorkforceTriggerUpdateInput) => Promise<void> {
  return async (triggerId, patch) => {
    await swallowAsync(() => updateTrigger(triggerId, patch))
  }
}

export function wrapTriggerDelete(
  deleteTrigger: (triggerId: string) => Promise<void>
): (triggerId: string) => Promise<void> {
  return async triggerId => {
    await swallowAsync(() => deleteTrigger(triggerId))
  }
}
