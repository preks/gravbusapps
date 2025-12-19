import { useCallback } from 'react';

interface UseTravelRegionScrollProps {
  hasMoreRef: React.MutableRefObject<boolean>;
  isLoadingRef: React.MutableRefObject<boolean>;
  loadMoreTravelRegions: () => Promise<void>;
}

export const useTravelRegionScroll = ({
  hasMoreRef,
  isLoadingRef,
  loadMoreTravelRegions,
}: UseTravelRegionScrollProps) => {
  const handleTravelRegionScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { target } = e;
      if (target instanceof HTMLDivElement) {
        const { scrollTop, scrollHeight, clientHeight } = target;
        
        // Load more when within 10px of bottom
        if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreRef.current && !isLoadingRef.current) {
          console.log('🚀 Near bottom! Triggering loadMoreTravelRegions');
          loadMoreTravelRegions();
        }
      }
    },
    [loadMoreTravelRegions, hasMoreRef, isLoadingRef]
  );

  return { handleTravelRegionScroll };
};


