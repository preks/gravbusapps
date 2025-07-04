---
trigger: always_on
---

# Project Development
- Simplify the code as much as possible and keep it clean
- Make code changes minimal and focused
- Focus on clear separation of code and its responsibilities
- Make usage of existing code, functions or components
- Remove unused code
- Remove commented code
- Keep usage of `console.log` minimal and avoid `console.log` when user data, access tokens, responses or any other sensitive data are used
- Keep usage of code comments minimal and only describe React components, utility functions and complex code blocks
- Remove unused imports or imports that are not used
- Use the Conventional Commits specification for git commit messages

## Publishing

- Apps and forms must be published **daily**
- Use:
  - `npm run publish:screen -- /<module>/<sub-module>/apps/<app-folder>` for apps
  - `npm run publish:screen -- /<module>/<sub-module>/forms/<form-folder>` for forms
- Optional Resource URL mode: `--resource` or `-r` - enables prompts for creating resource URLs (by default, direct publishing without prompts)