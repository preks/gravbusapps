const PAGE_NUMBER_LAYOUT_SELECTOR = '[data-rm-page-number-layout="true"]'

export function layoutPageNumberSlot(layoutRoot: HTMLElement) {
  delete layoutRoot.dataset.rmPageNumberBelow
  layoutRoot.style.removeProperty('--rm-page-number-center-top')
  layoutRoot.style.removeProperty('--rm-page-number-layout-min-height')
}

export function layoutPageNumberSlots(root: ParentNode) {
  const layouts = root.querySelectorAll(PAGE_NUMBER_LAYOUT_SELECTOR)
  layouts.forEach(layout => {
    if (layout instanceof HTMLElement) {
      layoutPageNumberSlot(layout)
    }
  })
}
