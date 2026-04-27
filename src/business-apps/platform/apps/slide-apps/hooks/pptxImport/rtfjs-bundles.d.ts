// rtf.js ships per-namespace UMD bundles that we import individually so only
// the WMFJS + EMFJS code lands in the bundle (not RTFJS, which is ~2 MB and
// unrelated). The package only publishes types for the top-level entry, so
// we declare the bundle sub-paths here using the same shape.
declare module 'rtf.js/dist/WMFJS.bundle' {
  export { Renderer, IRendererSettings } from 'rtf.js/dist/src/wmfjs/Renderer'
  export { WMFJSError as Error, loggingEnabled } from 'rtf.js/dist/src/wmfjs/Helper'
}

declare module 'rtf.js/dist/EMFJS.bundle' {
  export { Renderer, IRendererSettings } from 'rtf.js/dist/src/emfjs/Renderer'
  export { EMFJSError as Error, loggingEnabled } from 'rtf.js/dist/src/emfjs/Helper'
}
