---
alwaysApply: true
---

# Feature Flag Integration Pattern

When working with Feature or Feature Flag APIs in business apps:

- Use `useFeature()` from `src/common/hooks/useFeature.ts`
- Always import `Feature` from `src/common/types/constants/FeatureHub.ts` when a feature is requested by the user
- Use the imported `Feature` to check if a certain feature is available

## Usage Conventions

- Each feature is an object which holds the available sub features
- Each sub feature has a key which must be used for the `useFeature()` hook as parameter
- The result of the `useFeature()` hook must be checked against the `Values` property of the used sub feature to detect if a certain feature is available
- Available feature are grouped by module and are related to org chart, core, HCM, CRM, FLOW and platform
- If a feature must be used, check the existing features first before proposing to generate a new one

### Example:

@src/business-apps/hr/core/apps/employee-record/components/ProfileHeader.tsx

## Component File Structure

```typescript
import { useFeature } from "@/common/hooks/useFeature";
import { Feature } from "@/common/types/constants/FeatureHub";

const coreCollaborationMode = useFeature(Feature.Core.Collaboration.Key);
const isAudioCallEnabled = coreCollaborationMode === Feature.Core.Collaboration.Values.Full;
const isVideoCallEnabled = coreCollaborationMode === Feature.Core.Collaboration.Values.Full;

<button
    onClick={handleAudioCall}
    title="Audio Call"
    disabled={!isAudioCallEnabled}
/>

<button
    onClick={handleVideoCall}
    title="Video Call"
    disabled={!isVideoCallEnabled}
/>
```
