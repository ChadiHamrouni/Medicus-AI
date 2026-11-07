import { Dimensions } from 'react-native';

export const { width: screenWidth } = Dimensions.get('window');
export const MAX_ATTACHMENT_WIDTH = screenWidth * 0.7;

export const ANIMATION_DURATION = 300;

export const MESSAGE_COLORS = {
  sending: {
    current: 'bg-gray-200',
    other: 'bg-gray-100',
  },
  failed: {
    current: 'bg-red-100',
    other: 'bg-red-50',
  },
  default: {
    current: 'bg-orange-100',
    other: 'bg-gray-100',
    sara: 'bg-transparent',
  },
} as const;

export const OPACITY_VALUES = {
  default: 1,
  sending: 0.9,
  failed: 0.95,
  failedBubble: 0.7,
} as const;
