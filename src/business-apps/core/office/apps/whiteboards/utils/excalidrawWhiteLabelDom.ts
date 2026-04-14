/**
 * Hides Excalidraw UI we cannot turn off via props (e.g. duplicate data-testid on Mermaid row).
 * Scoped under the whiteboard root only.
 */
export function installExcalidrawWhiteLabelDomPatches(root: HTMLElement | null): () => void {
  if (!root || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const apply = () => {
    root.querySelectorAll('[data-testid="toolbar-embeddable"]').forEach(el => {
      const text = el.textContent || ''
      if (/mermaid/i.test(text)) {
        const node = el.closest('.dropdown-menu-item') || el.closest('button') || el.closest('li') || el
        if (node instanceof HTMLElement) node.classList.add('nw-wb-hide-vendor')
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
  }

  apply()
  const observer = new MutationObserver(apply)
  observer.observe(root, { subtree: true, childList: true, characterData: true })
  return () => observer.disconnect()
}
