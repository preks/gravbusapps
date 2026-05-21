import { runDetectedCellMutationPersistEmitDispatch } from './univerMountHandleDetectedCellMutationPersistEmit'
import { runDetectedCellMutationPersistPlanPhase } from './univerMountHandleDetectedCellMutationPersistPlan'
import { resolveDetectedCellMutation } from './univerMountHandleDetectedCellMutationResolve'
import type {
  HandleDetectedCellMutationArgs,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

export type {
  HandleDetectedCellMutationArgs,
  UniverMountHandleDetectedCellMutationDeps
} from './univerMountHandleDetectedCellMutation.types'

export function createUniverMountHandleDetectedCellMutation(
  deps: UniverMountHandleDetectedCellMutationDeps
): (mutationArgs: HandleDetectedCellMutationArgs) => boolean | Promise<boolean> {
  return (mutationArgs: HandleDetectedCellMutationArgs): boolean | Promise<boolean> => {
    const resolved = resolveDetectedCellMutation(deps, mutationArgs)
    if (resolved.status === 'return') {
      return resolved.value
    }
    const planned = runDetectedCellMutationPersistPlanPhase(deps, resolved.ready)
    if (planned.kind === 'return') {
      return planned.value
    }
    return runDetectedCellMutationPersistEmitDispatch(deps, planned.emit)
  }
}
