// Jest mock for `remark-gfm` (ESM-only). The mocked react-markdown
// renderer doesn't use plugins, so a no-op default export is enough.
module.exports = () => {}
module.exports.default = () => {}
