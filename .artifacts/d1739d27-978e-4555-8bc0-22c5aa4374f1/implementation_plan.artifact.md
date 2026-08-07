# Implementation Plan - Secure Journaling & CBT Detail Screen

This plan covers the implementation of secure biometric access to MindMate journal entries and the creation of a high-fidelity Journal Detail screen with AI analysis and CBT suggestions.

## User Review Required

> [!IMPORTANT]
> Biometric authentication will be required when:
> 1. Opening a specific journal entry.
> 2. Initiating the "Create New Entry" flow.
>
> I will change `MainActivity` to extend `FragmentActivity` to support the `BiometricPrompt` API.

## Proposed Changes

### Dependencies & Setup

#### [MODIFY] [libs.versions.toml](file:///G:/mad project/gradle/libs.versions.toml)
- Add `androidx.biometric:biometric:1.1.0`.

#### [MODIFY] [build.gradle.kts](file:///G:/mad project/app/build.gradle.kts)
- Add biometric dependency.

### Security Module

#### [NEW] [BiometricAuthenticator.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/security/BiometricAuthenticator.kt)
- Create a utility class/wrapper for `BiometricPrompt`.

### Data Layer Enhancements

#### [MODIFY] [MindMateRepository.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/data/MindMateRepository.kt)
- Enhance `insertJournalEntry` to attempt a sync via Retrofit immediately or in a background worker (simplest for now is immediate sync with try-catch).

### UI Components

#### [NEW] [JournalDetailScreen.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/journal/JournalDetailScreen.kt)
- Multi-tab interface: Journal Entry, AI Analysis, CBT Suggestions.
- Segmented pill toggle.
- Scrollable list of logs.
- Bottom overlay card with progress indicator.

#### [NEW] [CreateEntryScreen.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/journal/CreateEntryScreen.kt)
- Form for Title, Mood (dropdown), and Content.
- Save button triggers biometric auth before persisting.

#### [MODIFY] [Routes.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/navigation/Routes.kt)
- Add `CreateEntry` route if needed (or handle as a dialog).

#### [MODIFY] [MainActivity.kt](file:///G:/mad project/MainActivity.kt)
- Change base class to `FragmentActivity`.
- Update `entryProvider` to include the new screens.
- Implement biometric check logic during navigation.

## Verification Plan

### Automated Tests
- Run `./gradlew :app:assembleDebug` to verify build.

### Manual Verification
- Verify that clicking "Create Entry" or an existing entry triggers the biometric prompt.
- Verify the UI matches the design provided in the reference image.
- Check Room database for saved entries.
