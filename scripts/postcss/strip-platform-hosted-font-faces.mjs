// Remove @font-face rules for /platform/assets/fonts/* from remote screen CSS (CDN main.css).

/** @param {string} css */
export function stripPlatformHostedFontFaces(css) {
  return css.replace(/@font-face\s*\{[^}]*\/platform\/assets\/fonts\/[^}]*\}/gi, '')
}

export function stripPlatformHostedFontFacesVitePlugin() {
  return {
    name: 'strip-platform-hosted-font-faces',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'asset' || !chunk.fileName.endsWith('.css')) continue
        if (typeof chunk.source !== 'string') continue
        chunk.source = stripPlatformHostedFontFaces(chunk.source)
      }
    }
  }
}
