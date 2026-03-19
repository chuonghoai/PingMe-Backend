/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { calculateDistance } from '../../utils/calculate.util';

// Handle friend near
export const processFriendNear = (
  actorLat: number,
  actorLng: number,
  friendLat: number,
  friendLng: number,
  actorId: string,
  friendId: string,
  distanceLimit: number,
  spamCacheMap: Map<string, number>,
): { shouldNotify: boolean; distance: number } => {
  const distance = calculateDistance(actorLat, actorLng, friendLat, friendLng);
  const cacheKey = `${actorId}_${friendId}`;

  if (distance <= distanceLimit) {
    // Anti spam request in 30p
    const lastNotified = spamCacheMap.get(cacheKey);
    const now = Date.now();
    if (lastNotified && now - lastNotified < 30 * 60 * 1000) {
      return { shouldNotify: false, distance };
    }

    spamCacheMap.set(cacheKey, now);
    return { shouldNotify: true, distance };
  } else {
    // Delete actor and target in cache
    if (spamCacheMap.has(cacheKey)) {
      spamCacheMap.delete(cacheKey);
    }
    return { shouldNotify: false, distance };
  }
};

// Format payload to emit
export const buildNotificationPayload = (
  subType: 'FRIEND_MOVED' | 'FRIEND_NEAR',
  title: string,
  message: string,
  metadata: any,
) => {
  return {
    type: 'LOCATION',
    subType,
    title,
    message,
    metadata,
  };
};
