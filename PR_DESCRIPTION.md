# Every Page: User Avatar and Subtitle Enhancement

## 🎯 Overview

Enhances the NEWWORK Every page (`/platform/every`) with personalized user avatar display and improved subtitle messaging.

## ✨ Changes

### 1. User Avatar in Center Graph

- Added current user's profile picture to the center circle of the connections visualization graph
- Implemented `useCurrentUserPicture` hook to fetch employee avatar via GraphQL
- Added fallback to user initials (first + last name) when avatar is unavailable
- Supports multiple image formats with graceful fallback (JPEG → PNG → GIF)

### 2. Updated Hero Subtitle

- Enhanced subtitle to emphasize "intelligent workplace" positioning
- New text: "Your intelligent workplace. The personal productivity universe with AI assistant, documents, time tracking, and everything you need to work smarter, not harder."

## 🔧 Technical Details

### Modified Files

- `src/business-apps/platform/apps/newwork-every/NewworkEvery.tsx`
  - Added `useCurrentUserPicture` hook integration
  - Extracts `accessToken` and `userInfo` from context
  - Passes `pictureThumbnail` and `initials` to ConnectionsVisualization

- `src/business-apps/platform/apps/newwork-every/components/HeroSection.tsx`
  - Updated subtitle text to include "Your intelligent workplace"

- `src/business-apps/platform/apps/newwork-every/components/ConnectionsVisualization.tsx`
  - Added `userAvatar` and `userInitials` props
  - Replaced center "EVERY" text with Avatar component
  - Implemented image format fallback handling
  - Added graceful error handling for avatar loading

- `src/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture.ts`
  - Created new hook to fetch employee profile picture
  - Queries `Employee.pictureThumbnail` via GraphQL
  - Handles loading states and error cases

### GraphQL Query

```graphql
query GetEmployeePicture($id: uuid) {
  Employee(where: { id: { _eq: $id } }, limit: 1) {
    pictureThumbnail
  }
}
```

## 🎨 UI/UX Improvements

- **Personalization**: Users see their own avatar in the center of the productivity orbit
- **Professional appearance**: Fallback to initials maintains visual consistency
- **Brand messaging**: Subtitle reinforces "intelligent workplace" positioning
- **Accessibility**: Avatar includes proper alt text and fallback handling

## ✅ Testing

- [x] Avatar displays correctly for users with profile pictures
- [x] Initials fallback works for users without pictures
- [x] Multiple image format support tested
- [x] Subtitle text displays correctly on all screen sizes
- [x] No linter errors
- [x] Build and deployment successful

## 📸 Visual Changes

- Center circle now shows user's profile picture or initials
- Subtitle includes "Your intelligent workplace" messaging
- Graph maintains all existing functionality (hover states, connections, etc.)

## 🚀 Deployment

Screen published to: `/platform/every`
Azure CDN: `screens/platform/apps/newwork-every/index.js`

---

**Branch**: `feature/NO-TICKET_every-page-user-avatar-subtitle`  
**Target**: `develop`
