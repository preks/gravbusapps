/**
 * Radix Select renders its content in a portal (outside DialogContent). Without this, the dialog
 * treats clicks on the dropdown as "outside" interactions — selection often does not apply and
 * it can feel like "nothing happens".
 *
 * Pass to DialogContent: `onPointerDownOutside` and `onInteractOutside`.
 */
export function preventDialogCloseOnSelectOutside(event: {
  preventDefault: () => void
  target: EventTarget | null
}): void {
  const { target } = event
  if (
    target instanceof Element &&
    target.closest('[data-slot="select-content"],[data-radix-select-content],[data-radix-select-viewport]')
  ) {
    event.preventDefault()
  }
}
