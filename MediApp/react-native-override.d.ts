// React Native type overrides to prevent Web API conflicts
declare module 'react-native' {
  // Override any conflicting global types here if needed
  interface ViewStyle {
    [key: string]: any;
  }

  interface TextStyle {
    [key: string]: any;
  }

  interface ImageStyle {
    [key: string]: any;
  }
}

// Prevent DOM types from being available
declare global {
  // Remove problematic Web API types
  interface Window {}
  interface Document {}
  interface Element {}
  interface HTMLElement {}
}

export {};
