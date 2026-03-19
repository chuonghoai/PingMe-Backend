export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatLastActive = (
  lastActiveAt: Date | string | null | undefined,
  isOnline: boolean,
): string => {
  if (isOnline) return 'đang online';
  if (!lastActiveAt) return 'Không rõ';

  const now = new Date();
  const past = new Date(lastActiveAt);

  const diffMs = now.getTime() - past.getTime();

  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) {
    return diffMins <= 0 ? 'Vừa xong' : `${diffMins} phút trước`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} tiếng trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
};
