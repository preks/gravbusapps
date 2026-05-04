/**
 * Hides Excalidraw UI we cannot turn off via props (e.g. duplicate data-testid on Mermaid row).
 * Scoped under the whiteboard root only.
 */
export function installExcalidrawWhiteLabelDomPatches(root: HTMLElement | null): () => void {
  if (!root || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const apply = () => {
    // The Embed-URL tool ("toolbar-embeddable") is disabled because we have no URL
    // allow-list configured; clicking it just shows an error toast. Hide both the
    // tool entry and any mermaid-related row from the extra-tools dropdown.
    root.querySelectorAll('[data-testid="toolbar-embeddable"]').forEach(el => {
      const node = el.closest('.dropdown-menu-item') || el.closest('button') || el.closest('li') || el
      if (node instanceof HTMLElement) node.classList.add('nw-wb-hide-vendor')
    })
    root.querySelectorAll('.dropdown-menu-item').forEach(el => {
      const text = (el.textContent || '').trim()
      if (/mermaid/i.test(text)) {
        if (el instanceof HTMLElement) el.classList.add('nw-wb-hide-vendor')
      }
    })

    root.querySelectorAll('div').forEach(div => {
      if (!(div instanceof HTMLElement)) return
      if (
        div.childNodes.length === 1 &&
        div.childNodes[0]?.nodeType === Node.TEXT_NODE &&
        (div.textContent || '').trim() === 'Generate'
      ) {
        div.classList.add('nw-wb-hide-vendor')
      }
    })

    /*
     * Ensure every shape-tool button in the bottom toolbar has a `title` attribute so users
     * always see a tooltip on hover (Excalidraw sometimes omits it for the trailing tools
     * like Frame / Embed). We derive the label from the visible label span, the aria-label
     * on the input, or the data-testid suffix.
     */
    root.querySelectorAll('.shapes-section label.ToolIcon').forEach(labelEl => {
      if (!(labelEl instanceof HTMLElement)) return
      if (labelEl.getAttribute('title')) return
      const ariaLabel = labelEl.querySelector('input')?.getAttribute('aria-label')
      const visibleLabel = labelEl.querySelector('.ToolIcon__label')?.textContent?.trim()
      const testId = labelEl.querySelector('input')?.getAttribute('data-testid') || ''
      const fromTestId = testId
        .replace(/^toolbar-/, '')
        .replace(/[-_]/g, ' ')
        .trim()
      const tooltip =
        ariaLabel || visibleLabel || (fromTestId ? fromTestId.charAt(0).toUpperCase() + fromTestId.slice(1) : '')
      if (tooltip) labelEl.setAttribute('title', tooltip)
    })
  }

  apply()
  const observer = new MutationObserver(apply)
  observer.observe(root, { subtree: true, childList: true, characterData: true })
  return () => observer.disconnect()
}
