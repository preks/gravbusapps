# DocuSign Endpoints Overview

The web layer exposes a small set of REST endpoints that proxy DocuSign flows for business apps. All requests must include the platform `Authorization: Bearer <token>` header.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/docusign/auth/status` | `GET` | Returns `{ authenticated: boolean }` so the UI can prompt for DocuSign login. |
| `/api/docusign/auth/login` | `GET` | Starts the DocuSign OAuth login. Accepts `returnTo` query param to redirect back after consent. |
| `/api/docusign/auth/logout` | `GET/POST` | Clears the DocuSign session. |
| `/api/docusign/envelope/create-embedded-signing` | `POST` | Creates a new envelope and returns `{ envelopeId, redirectUrl }`. The UI should persist the envelope id before redirecting. |
| `/api/docusign/envelope/create-email-signing` | `POST` | Creates an email-based signing request and returns `{ envelopeId }`. |
| `/api/docusign/envelope/create-recipient-view` | `POST` | Re-opens a DocuSign recipient view for an existing envelope and returns `{ redirectUrl }`. Use this when the assignee already has an envelope id. |
| `/api/docusign/envelope/status/:envelopeId` | `GET` | Returns the current status of an envelope so we can show badges in the UI. |

The frontend now caches envelope statuses per document so task lists, detail sheets, and the DocuSign modal can switch their CTAs between “Request Signature”, “Resume signing”, or “View envelope” without spamming the backend—each visible document calls `/status/:envelopeId` at most once per session.

## Starting the DocuSign login flow

Because the platform is hosted behind a Kong gateway that expects browser navigations to stay under `/platform`, we no longer hard-redirect the entire window to `/api/docusign/auth/login`. Instead, the SPA calls the login endpoint via `fetch` with `redirect: 'manual'`, includes `Accept: application/json` and `X-DocuSign-Client: spa`, and receives `{ redirectUrl }` from the server. Only that DocuSign URL is opened with `window.location.assign`, so the browser never navigates directly to `/api/...` and Kong remains happy.

The backend now builds the callback / redirect hosts from `X-Forwarded-Proto` and `X-Forwarded-Host`, so each tenant automatically gets correct URLs even if `NEXT_PUBLIC_BASE_URL` differs per deployment.

```ts
const headers: HeadersInit = {
  Accept: 'application/json',
  'X-DocuSign-Client': 'spa',
  ...(accessToken && { Authorization: `Bearer ${accessToken}` })
}
const res = await fetch(`/api/docusign/auth/login?returnTo=${encodeURIComponent(returnTo)}`, {
  method: 'GET',
  redirect: 'manual',
  credentials: 'include',
  headers
})
const { redirectUrl } = await res.json()
window.location.assign(redirectUrl) // DocuSign consent page
```

If the response ever falls back to an HTTP redirect (e.g., direct browser navigation), the SPA still looks at the `Location` header and manually navigates.

## Logging out of DocuSign

Logout now follows the same pattern: the UI sends a `POST` to `/api/docusign/auth/logout` with the access token, `redirect: 'manual'`, and a `returnTo` query param containing the current `/platform/...` location. The server clears the DocuSign session, revokes tokens if possible, and redirects back to that path (validated against the forwarded host). The SPA only calls `window.location.assign` after it receives that response, so Kong never observes the top-level frame at `/api/...`.

```ts
const target = window.location.pathname + window.location.search + window.location.hash
const res = await fetch(`/api/docusign/auth/logout?returnTo=${encodeURIComponent(target)}`, {
  method: 'POST',
  redirect: 'manual',
  credentials: 'include',
  headers: { Authorization: `Bearer ${accessToken}` }
})
if (res.type === 'opaqueredirect') {
  window.location.assign('/api/docusign/auth/logout')
  return
}
const location = res.headers.get('Location')
if (location) {
  window.location.assign(location)
}
```

## Persisting `docusignEnvelopeId` on Investment Tasks

After any signing flow completes we must update the underlying investment task document so the UI can display the envelope status and re-open recipient views. Use the existing process endpoint:

```ts
await restClient.post('/investment-relations/updateInvestmentTask', payload, {
  headers: { Authorization: `Bearer ${accessToken}` }
})
```

The payload should mirror the `TaskForm` submission with one important change: include the new `docusignEnvelopeId` inside the `investmentTask.documents[i].fileInfo` object for the document that was sent to DocuSign. All other data (context, task metadata, etc.) must remain unchanged so the process engine can validate optimistic locking.

Starting December 2025 the UI also stores `fileInfo.docusignEnvelopeMode` (`'embedded' | 'email'`) so it knows whether a given envelope supports recipient views. Embedded flows save `'embedded'`, while email-based requests save `'email'`. Backfills are optional; envelopes without the flag default to embedded behavior.

Example snippet:

```json
{
  "taskId": "9d7d0d61-b565-48d7-a145-87843acb4726",
  "investmentTask": {
    "id": "9d7d0d61-b565-48d7-a145-87843acb4726",
    "version": 0,
    "documents": [
      {
        "id": "85c3ad63-49bf-447c-b447-fca9e05f0f1f",
        "version": 0,
        "fileInfo": {
          "...": "...",
          "docusignEnvelopeId": "4aab0c8d-e0c4-4d2d-b6b1-5f5b20d2730c"
        }
      }
    ]
  }
}
```

The UI now calls this endpoint immediately after receiving the new envelope id (embedded or email flows). If the user is the assignee and the selected document already has a `docusignEnvelopeId`, the modal calls `/api/docusign/envelope/create-recipient-view` instead of creating a duplicate envelope.

