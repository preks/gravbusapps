---
trigger: always_on
---

# Context and User Access

- All components must extend `BusinessAppContextProps`
- Use `accessToken`, `user`, `userInfo`, and `employeeId` from context
- Use locale and structure ID from:
  - `getCurrentActiveUserLocale()` in `windowUtils.ts`
  - `getCurrentActiveStructureId()` in `windowUtils.ts`
- For translations, use `getTranslationFromI18nKeyAndLabel()`—**never hardcode strings**
