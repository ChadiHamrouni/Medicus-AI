/**
 * Formats seconds into a MM:SS string format
 * @param seconds - The number of seconds to format
 * @returns A string in the format MM:SS
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
