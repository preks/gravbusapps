import { useCallback } from 'react';

export const useOpenChat = () => {
  const openChatWithUser = useCallback((userId: string) => {
    console.log('Opening chat with user:', userId);
    // Implement chat opening logic here
    window.postMessage({
      type: 'OPEN_CHAT',
      payload: { userId }
    }, '*');
  }, []);

  const openAudioConferenceWithUser = useCallback((userId: string) => {
    console.log('Opening audio conference with user:', userId);
    // Implement audio conference logic here
    window.postMessage({
      type: 'OPEN_AUDIO_CONFERENCE',
      payload: { userId }
    }, '*');
  }, []);

  const openVideoConferenceWithUser = useCallback((userId: string) => {
    console.log('Opening video conference with user:', userId);
    // Implement video conference logic here
    window.postMessage({
      type: 'OPEN_VIDEO_CONFERENCE',
      payload: { userId }
    }, '*');
  }, []);

  return { 
    openChatWithUser,
    openAudioConferenceWithUser,
    openVideoConferenceWithUser 
  };
};
