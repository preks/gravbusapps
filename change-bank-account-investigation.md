## Change Bank Account Investigation (Dec 2025)

### What we fixed

- Corrected process start event in `ActionMenu.tsx` to use `processName: changeBankAccount`, `builderType: NATIVE_SCREEN`, and `skipScreen: true` to jump directly to the first task screen.
- Added task-aware submit in `ChangeBankAccount.tsx`: when `psi_taskPayload` exists (task screen), we emit `pse_complete`; otherwise we emit `pse_submit`.
- Added extensive logging in `AppActionForm` to trace submit, payload, completion events, and timeout.

### What is still broken

- After submit, the modal becomes empty and times out; HR never receives the task.
- The task screen registration in Screen Management (`frm_changeBankAccountEnterBankAccount`) is still marked `"release": "false"`. That likely prevents the executor from rendering the form properly, leading to the empty modal and no completion event.
- The landing screen (`frm_changeBankAccount`) is still loading first even when `psi_taskPayload` is present; with `skipScreen: true` we expect to open the task screen directly.

### Current Screen Management state (from latest GETs)

- `frm_changeBankAccount` (namespace `nw_dev`): componentPath `/hr/core/forms/changeBankAccount`, `release: true`, updatedAt `2025-12-22T16:14:21.283`.
- `frm_changeBankAccountEnterBankAccount` (namespace `nw_hrm`): componentPath `/hr/core/forms/changeBankAccount`, `builderType: NATIVE_SCREEN`, **release: false**, updatedAt `2025-12-23T12:01:40.765`.

### Evidence from logs (13:24 build)

```
[AppActionButton] Process context is ready, opening modal { processName: 'changeBankAccount', builderType: 'NATIVE_SCREEN', ... }
[AppActionForm] Component mounted { formId: 'change-bank-account-form' }
[AppActionForm] Submit handler triggered
[AppActionForm] Payload built { formId: 'change-bank-account-form', payload: { firstName: '...', ...}, isTaskScreen: true }
[AppActionForm] Emitting pse_complete
[AppActionForm] Waiting for completion event...
(30s later) [AppActionForm] Timeout waiting for completion
```

- The executor receives `pse_complete`, but never sends `pse_done`.
- The modal then becomes empty and times out.

### Next steps

1. **Screen Management**: Either publish `frm_changeBankAccountEnterBankAccount` with `release: true` in the `nw_hrm` namespace, or reconfigure how the task screen is registered.
2. **Process definition**: Check if the `enterBankAccount` task references the correct screen key and namespace.
3. **Executor behavior**: Confirm `skipScreen: true` is handled properly; if the task screen is `release: false`, the executor may fall back to showing the landing screen, which then becomes empty when it tries to complete.

