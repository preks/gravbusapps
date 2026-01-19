import { useEffect } from 'react'

export function useRewrapAntDStylesLive(layerName = 'antd', observeDelay = 50) {
  useEffect(() => {
    const wrappedHashes = new Set<string>()
    let batchCSS: string[] = []
    let flushTimeout: ReturnType<typeof setTimeout> | null = null

    // Create (or reuse) the single layered style tag
    const getOrCreateLayeredStyleTag = (): HTMLStyleElement => {
      let tag = document.querySelector(`style[data-layer-batched="${layerName}"]`)
      if (tag instanceof HTMLStyleElement) return tag

      tag = document.createElement('style')
      tag.setAttribute('data-layer-batched', layerName)
      document.head.appendChild(tag)
      return tag as HTMLStyleElement
    }

    // Flush the batch into a single @layer block
    const flushBatch = () => {
      if (batchCSS.length === 0) return

      const styleEl = getOrCreateLayeredStyleTag()
      const existing = styleEl.textContent?.trim() || ''

      const newContent = `@layer ${layerName} {\n${batchCSS.join('\n')}\n}`
      styleEl.textContent = existing
        ? existing.replace(`@layer ${layerName} {`, `@layer ${layerName} {\n${batchCSS.join('\n')}`)
        : newContent

      batchCSS = []
    }

    const wrapAndRemove = (styleEl: HTMLStyleElement) => {
      const hash = styleEl.getAttribute('data-css-hash') || styleEl.getAttribute('rc-util-key') || ''
      const css = styleEl.textContent?.trim()

      if (!hash || !css) return

      if (!wrappedHashes.has(hash)) {
        batchCSS.push(css)
        wrappedHashes.add(hash)
        if (!flushTimeout) {
          flushTimeout = setTimeout(() => {
            flushBatch()
            flushTimeout = null
          }, observeDelay)
        }
      }

      // Always remove the original style tag to prevent duplication
      styleEl.remove()
    }

    const isAntDStyle = (el: Element): el is HTMLStyleElement => {
      return (
        el.nodeName === 'STYLE' &&
        el instanceof HTMLStyleElement &&
        ((el.hasAttribute('data-css-hash') &&
          ['prepend', 'prependQueue'].includes(el.getAttribute('data-rc-order') || '')) ||
          el.getAttribute('rc-util-key') === '@ant-design-icons') &&
        !el.hasAttribute('data-layer-batched')
      )
    }

    // Initial scan
    document.querySelectorAll("style[data-css-hash],style[rc-util-key='@ant-design-icons']").forEach(el => {
      if (isAntDStyle(el)) wrapAndRemove(el)
    })

    // Observe new styles dynamically
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        ;[...mutation.addedNodes].forEach(node => {
          if (node instanceof Element && isAntDStyle(node)) {
            setTimeout(() => wrapAndRemove(node as HTMLStyleElement), observeDelay)
          }
        })
      })
    })

    observer.observe(document.head, { childList: true })

    return () => {
      observer.disconnect()
      if (flushTimeout) clearTimeout(flushTimeout)
    }
  }, [layerName, observeDelay])
}
