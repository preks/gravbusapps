# Add Skill / Update Skill – flow additional data payload examples

The form reads `additionalData.contextData` or `additionalData.psi_taskPayload.psi_initialParameters` to determine the mode and skill context. Below are example payloads for each mode, following the same shape as your attach verification example.

---

## attachVerification (your example)

```json
{
  "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
  "psi_taskPayload": {
    "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
    "psi_initialParameters": {
      "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
      "mode": "attachVerification",
      "skillId": "5be9a880-c440-489e-90ff-e8d7341d813c",
      "employeeSkillId": "84459e98-155d-49db-9d3e-6257910fea6e",
      "skillName": "Annoyer "
    }
  },
  "platformContext": {
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf"
  }
}
```

---

## deactivate

```json
{
  "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
  "psi_taskPayload": {
    "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
    "psi_initialParameters": {
      "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
      "mode": "deactivate",
      "skillId": "5be9a880-c440-489e-90ff-e8d7341d813c",
      "employeeSkillId": "84459e98-155d-49db-9d3e-6257910fea6e",
      "skillName": "Annoyer "
    }
  },
  "platformContext": {
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf"
  }
}
```

---

## activate

```json
{
  "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
  "psi_taskPayload": {
    "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
    "psi_initialParameters": {
      "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
      "mode": "activate",
      "skillId": "5be9a880-c440-489e-90ff-e8d7341d813c",
      "employeeSkillId": "84459e98-155d-49db-9d3e-6257910fea6e",
      "skillName": "Annoyer "
    }
  },
  "platformContext": {
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf"
  }
}
```

---

## changeLevel

```json
{
  "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
  "psi_taskPayload": {
    "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
    "psi_initialParameters": {
      "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
      "mode": "changeLevel",
      "skillId": "5be9a880-c440-489e-90ff-e8d7341d813c",
      "employeeSkillId": "84459e98-155d-49db-9d3e-6257910fea6e",
      "skillName": "Annoyer ",
      "currentLevel": 5
    }
  },
  "platformContext": {
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf"
  }
}
```

- `currentLevel`: current skill level (1–10). Optional; if omitted, the form uses the existing level from the employee skill.
- `skillName`: display name for the skill. Optional; if provided, the form shows it immediately and avoids briefly showing the skill ID before employee data loads.

---

## Edit skills (add/edit list) – no flow mode

When opening the form to add or edit multiple skills (no single-skill action), the payload typically does not set a flow mode. The form uses only `employeeId` (from `additionalData.employeeId`, `psi_taskPayload.employeeId`, `psi_taskPayload.psi_initialParameters.employeeId`, or `userInfo.employeeDetails.employeeId`). No `mode`, `skillId`, or `employeeSkillId` is required in that case.
