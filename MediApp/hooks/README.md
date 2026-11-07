# Hooks

This folder contains all custom React hooks organized by domain for better maintainability and discoverability.

## 📁 Folder Structure

```
hooks/
├── auth/              # Authentication & authorization
├── doctor/            # Doctor profile & discovery
├── patient/           # Patient profile & data management
├── chat/              # Messaging, Sara AI
├── ui/                # UI components, forms, keyboard
├── navigation/        # Navigation & search
├── settings/          # Account settings
├── network/           # Network status & error handling
└── _shared/           # Shared utilities (internal use)
```

## 🔍 Domain Overview

### Authentication (`auth/`)

Handles user authentication, JWT tokens, and session management.

- `useAuth` - Main authentication hook
- `useJwtExpiration` - JWT token expiration handling
- `useTokenPersistence` - Token storage across app restarts
- `mutations/useAuthMutations` - Login, logout, registration mutations

### Doctor (`doctor/`)

Doctor profile management and discovery features.

- `useDoctorProfile` - Unified doctor profile interface
- `useDoctorProfileSync` - Sync doctor profile with auth state
- `useDoctorDiscovery` - Search and filter doctors
- `useDoctorName` - Get doctor display names
- `mutations/` - Doctor profile update mutations
- `queries/` - Doctor profile and specialty queries

### Patient (`patient/`)

Patient profile and health data management.

- `usePatientProfile` - Unified patient profile interface
- `usePatientSync` - Sync patient data with auth state
- `data/` - Patient data hooks (medications, medical history, contacts)
- `mutations/` - Patient and dependent mutations
- `queries/` - Patient profile and dependent queries
- `_internal/` - Internal implementation hooks (not for external use)

### Chat (`chat/`)

Messaging, conversations, and AI integration.

- `useChatScreen` - Chat screen functionality
- `useConversations` - Conversation list management
- `useMessages` - Message loading and display
- `useSendMessage` - Send messages
- `sara/` - Sara AI voice and realtime features
- `mutations/` - Message mutations
- `queries/` - Conversation and message queries

### UI (`ui/`)

UI-related hooks for forms, keyboard, and common UI patterns.

- `forms/` - Form animations and validation
- `keyboard/` - Keyboard height and scroll handling
- `useModal` - Modal state management
- `useCountdownTimer` - Countdown timer utility
- `useThemeColor` - Theme color management
- `useColorScheme` - Color scheme detection

### Navigation (`navigation/`)

Navigation and user search features.

- `useTabBadges` - Tab badge counts
- `useUsersSearch` - User search with infinite scroll

### Settings (`settings/`)

Account and profile settings.

- `useAccountMutations` - Account update operations
- `useAccountProfileData` - Account profile data management

### Network (`network/`)

Network status and error recovery.

- `useNetworkStatus` - Network connectivity monitoring
- `useErrorRecovery` - Error recovery utilities

### Shared (`_shared/`)

⚠️ **Internal utilities** - Not intended for direct external use.

- `useErrorHandling` - Error handling utilities
- `useQueryConfig` - React Query configuration
- `queryFactories` - Query key factories

## 📦 Import Examples

### Recommended: Domain-Specific Imports

```typescript
// Clear and explicit
import { useAuth } from '@/hooks/auth';
import { useDoctorProfile } from '@/hooks/doctor';
import { usePatientProfile } from '@/hooks/patient';
import { useChatScreen } from '@/hooks/chat';
```

### Alternative: Barrel Imports

```typescript
// Still supported for backward compatibility
import { useAuth, useDoctorProfile, usePatientProfile } from '@/hooks';
```

### Subdomain Imports

```typescript
// Group related hooks from subdomains
import {
  useMedicationsData,
  useMedicationsOperations,
} from '@/hooks/patient/data';

import { useSaraVoicePlayback, useOpenAIRealtime } from '@/hooks/chat/sara';

import { useAnimatedFormField, useFormValidation } from '@/hooks/ui/forms';
```

## 🎯 Best Practices

### DO ✅

- Import from domain folders for better clarity: `from '@/hooks/auth'`
- Use subdomain imports for related hooks: `from '@/hooks/patient/data'`
- Keep hooks focused on a single responsibility
- Add JSDoc comments to public hooks
- Export from domain `index.ts` files

### DON'T ❌

- Import from `_internal/` folders outside the hooks directory
- Import from `_shared/` in application code
- Create circular dependencies between domains
- Mix concerns across domains

## 🔄 Migration from Old Structure

The hooks folder was recently reorganized. Old imports like:

```typescript
import { useAuth } from '@/hooks/useAuth';
```

Now work as:

```typescript
import { useAuth } from '@/hooks/auth';
// or
import { useAuth } from '@/hooks';
```

Both patterns are supported for backward compatibility.

## 🏗️ Adding New Hooks

1. **Identify the domain** - Which folder does it belong to?
2. **Create the hook file** - Place it in the appropriate domain folder
3. **Export from domain index** - Add to the domain's `index.ts`
4. **Add JSDoc comments** - Document parameters and return values
5. **Write tests** - Add unit tests for the hook

Example:

```typescript
// hooks/patient/data/useAllergies.ts
/**
 * Manages patient allergy data
 * @param patientId - The patient ID
 * @returns Allergy data and operations
 */
export function useAllergies(patientId: string) {
  // implementation
}

// hooks/patient/data/index.ts
export * from './useAllergies';
```

## 📊 Folder Metrics

- **Total hooks**: 50+ custom hooks
- **Domains**: 8 main domains
- **Internal hooks**: 4 (in `_internal/`)
- **Shared utilities**: 4 (in `_shared/`)

## 🤝 Contributing

When adding new hooks:

1. Follow the existing patterns in the domain
2. Keep hooks small and focused
3. Use TypeScript for type safety
4. Export from the appropriate `index.ts`
5. Update this README if adding a new domain

---

_Last updated: November 2025_
