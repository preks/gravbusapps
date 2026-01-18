# DocuSign ISV Compliance Checklist

| Requirement | Status | Evidence / Notes |
| --- | --- | --- |
| OAuth auth flow with per-user accounts | ✅ | `/api/docusign/auth/*`, `DocuSignSignatureModal` login/logout UX |
| Token refresh & secure storage | ✅ | `ensureValidToken`, `iron-session` (`docusign_session`) |
| No free-form signing / sender defines tags | ✅ | `ensureSignerTabs` adds SignHere + DateSigned tabs; Jest test `envelope.test.ts` |
| Envelope resume / sender view | ✅ | `/api/docusign/envelope/create-recipient-view` + “Resume signing” CTA |
| Email-based sending supported | ✅ | `/api/docusign/envelope/create-email-signing` & modal `emailOnly` flow |
| Digital Referral (Step 6) implemented | ✅ | UI banner/modal launches `DSDigitalSignup.startSignup` with our `partnerIK` + `/docusign/referral-complete` redirect |
| Correlation IDs/logging | ✅ | `X-Correlation-ID` header from modal, logged/echoed across every DocuSign API route |
| Documentation package prepared | ✅ | `docs/docusign-app-review-package.md`, `docusign-questionnaire-answers.md` |
| Demo script + recording checklist | ✅ | `docs/docusign-demo-script.md`, `docusign-demo-recording-checklist.md` |
| Env vars unchanged (per prompt-3) | ✅ | Using existing vars (`NEXT_PUBLIC_DOCUSIGN_CLIENT_ID`, `DOCUSIGN_CLIENT_SECRET`, `DOCUSIGN_PRODUCTION`, `SESSION_SECRET`) only |
| Demo video link captured | ⏳ | Fill `docs/docusign-app-review-package.md` once the video is recorded/hosted |

Next action: record & host the demo video, paste the link/password into the package doc, then submit questionnaire + video + checklist to DocuSign App Review.
