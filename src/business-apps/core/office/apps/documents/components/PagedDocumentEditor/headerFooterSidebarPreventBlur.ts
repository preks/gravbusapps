import type { MouseEvent } from 'react'

export function headerFooterSidebarPreventBlur(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
}
