import type { MouseEvent } from 'react'

export function headerFooterSidebarPreventBlur(event: MouseEvent<HTMLElement>) {
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [role="spinbutton"]'
    )
  ) {
    return
  }

  event.preventDefault()
}
