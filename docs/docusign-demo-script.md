# DocuSign Demo Video Script

## Overview
A narrated walkthrough demonstrating how Gravity’s DocuSign integration satisfies ISV General Connector requirements. Cover:
1. Connecting a user’s DocuSign account (auth flow)
2. Envelope request (embedded + sender view + tagging)
3. Envelope resume/status visibility
4. Email-only sender experience
5. Digital Referral (trial signup)
6. Logging/correlation for supportability

Estimated runtime: 6–7 minutes.

---

### Scene 1 – Intro & Context (0:00–0:30)
- Slide or on-screen overlay with Gravity logo + “DocuSign ISV Connector demo”.
- Narration points:
  - Gravity-platform renders remote business apps; DocuSign features are exposed inside task workflows.
  - Mention that all flows use the user’s own DocuSign credentials, no shared service account.

### Scene 2 – Authentication Flow (0:30–1:30)
- On Task Detail page, open DocuSign modal.
- Show unauthenticated state: “You need to authenticate with DocuSign first.”
- Click “Login”, highlight SPA fetch → DocuSign redirect.
- Narrate:
  - SPA calls `/api/docusign/auth/login` with `redirect: 'manual'` + `X-DocuSign-Client: spa`.
  - Backend stores `oauthState`, `returnTo`, builds callback via `X-Forwarded-*`.
  - After consent, callback exchanges tokens, saves session, and redirects with `X-Correlation-ID`.
- Return to modal showing “Authenticated with DocuSign” banner + logout link. Call out correlation ID display in alerts.

### Scene 3 – Embedded Signing + Tagging (1:30–3:00)
- Select an existing PDF attachment; ensure signer info pre-filled.
- Narrate:
  - `/api/docusign/envelope/create-embedded-signing` validates payload, injects deterministic SignHere/DateSigned tabs (no free-form signing).
  - Show DevTools network panel with correlation ID header.
- Click “Sign” → auto redirect to DocuSign sender view:
  - Pause to show tag placement (default signature + date stamps). Mention `ensureSignerTabs` enforcement + CFR compatibility.
- Complete signing, return to task:
  - Envelope badge updates to “Signed”.
  - Narrate metadata persistence (`fileInfo.docusignEnvelopeId`, `docusignEnvelopeMode`).

### Scene 4 – Resume / Sender View (3:00–3:45)
- Re-open modal for same document as assignee.
- Highlight “Resume signing” CTA (embedded mode).
- Narrate how `/create-recipient-view` reopens DocuSign with same correlation ID and show status polling via `/envelope/status/:id`.

### Scene 5 – Email Signing Scenario (3:45–4:30)
- Switch to “Upload document” + toggle `emailOnly`.
- Send email request; show success toast referencing `envelopeId`.
- Narration: recipients use DocuSign email, system still tracks envelope status + displays info badge (“DocuSign: sent”).

### Scene 6 – Digital Referral (4:30–5:30)
- Scroll to “Start DocuSign trial” banner (Task list or modal referral section).
- Fill work email + first/last name, confirm consent.
- Click “Start DocuSign trial”; highlight the DocuSign-hosted popup launched via `DSDigitalSignup.startSignup(firstName, lastName, email, phone?, partnerIK, loginRedirectUri, 'en')`.
- Narrate how the redirect URI brings the user back to Gravity so we can immediately trigger `/api/docusign/auth/login`, satisfying Step 6 without any custom backend proxy.

### Scene 7 – Logging & Supportability (5:30–6:15)
- Show server logs filtered by correlation ID (e.g., `grep correlationId`).
- Mention each API response echoes `correlationId`, enabling Support to map UI errors to backend logs quickly.
- Show alert message containing “Tracking ID: …”.

### Scene 8 – Outro (6:15–6:45)
- Recap key points:
  - OAuth login per user, session refresh via iron-session.
- Envelopes enforce tabs (no free-form), statuses visible inside tasks.
- Digital Referral implemented directly with DocuSign’s SDK + redirect URI workflow.
  - Demo covers tagging, sender view, referral, envelope management.
- Provide link/QR to hosted video + contact info for DocuSign review team.

---

## Shot List Checklist
| Step | Confirmed? | Notes |
| --- | --- | --- |
| Unauthenticated modal state captured |  |  |
| SPA login request & DocuSign consent |  |  |
| Authenticated badge + logout button |  |  |
| Embedded envelope creation + tag view |  |  |
| Completion + status badge update |  |  |
| Resume signing (sender view) |  |  |
| Email-only send workflow |  |  |
| Digital Referral form + DocuSign popup |  |  |
| Correlation ID logs & alerts displayed |  |  |
| Closing slide summarizing compliance |  |  |

