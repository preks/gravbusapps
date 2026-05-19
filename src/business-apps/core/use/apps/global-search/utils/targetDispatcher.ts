import { navigateTo } from '@/common/utils/navigationUtils'
import type { SearchTarget } from '../types'

export const dispatchSearchTarget = (target: SearchTarget): void => {
  if (target.kind === 'URL') {
    if (target.openIn === 'NEW_TAB') {
      globalThis.open(target.href, '_blank', 'noopener,noreferrer')
      return
    }

    navigateTo(target.href)
    return
  }

  if (target.kind === 'COMMAND') {
    globalThis.dispatchEvent(
      new CustomEvent('global-search-command', {
        detail: {
          commandId: target.commandId,
          payload: target.payload
        }
      })
    )
  }
}
