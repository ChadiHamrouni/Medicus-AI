import {
  format,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

/**
 * Returns the status text and online state based on the provided timestamp.
 *
 * Logic:
 * - If timestamp is missing: "Offline", isOnline: false
 * - If < 5 mins ago: "Online", isOnline: true
 * - If < 1 hour ago: "Last seen [X]m ago", isOnline: false
 * - If < 24 hours ago: "Last seen [X]h ago", isOnline: false
 * - Else: "Last seen [Date]", isOnline: false
 */
export const getOnlineStatus = (
  timestamp?: string | Date | null
): {
  text: string;
  isOnline: boolean;
  color: string;
} => {
  if (!timestamp) {
    return { text: 'Offline', isOnline: false, color: '#9CA3AF' }; // Gray-400
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = differenceInMinutes(now, date);

  if (diffInMinutes < 5) {
    return { text: 'Online', isOnline: true, color: '#22C55E' }; // Green-500
  }

  if (diffInMinutes < 60) {
    return {
      text: `Last seen ${diffInMinutes}m ago`,
      isOnline: false,
      color: '#6B7280',
    }; // Gray-500
  }

  const diffHours = differenceInHours(now, date);
  if (diffHours < 24) {
    return {
      text: `Last seen ${diffHours}h ago`,
      isOnline: false,
      color: '#6B7280',
    };
  }

  const diffDays = differenceInDays(now, date);
  if (diffDays < 7) {
    return {
      text: `Last seen ${diffDays}d ago`,
      isOnline: false,
      color: '#6B7280',
    };
  }

  return {
    text: `Last seen ${format(date, 'MMM d')}`,
    isOnline: false,
    color: '#6B7280',
  };
};

export const formatConversationTimestamp = (
  timestamp: string | Date
): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  } else if (diffDays < 7) {
    return `${Math.floor(diffDays)}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

/**
 * Formats event time string into clean AM/PM format
 * Handles various time string formats from backend
 */
export const formatEventTime = (timeString: string): string => {
  if (!timeString) return '';

  try {
    // Try to parse as HH:mm:ss format
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return format(date, 'h:mm a');
      }
    }

    // If parsing fails, try to parse as ISO time
    const date = new Date(`1970-01-01T${timeString}`);
    if (!isNaN(date.getTime())) {
      return format(date, 'h:mm a');
    }

    // Fallback: return as-is if it's already a reasonable time string
    if (timeString.length <= 8 && timeString.includes(':')) {
      return timeString;
    }

    // Last resort: extract HH:mm from malformed strings
    const match = timeString.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return format(date, 'h:mm a');
      }
    }

    return timeString; // Return original if all parsing fails
  } catch (error) {
    console.warn('Failed to format event time:', timeString, error);
    return timeString;
  }
};
