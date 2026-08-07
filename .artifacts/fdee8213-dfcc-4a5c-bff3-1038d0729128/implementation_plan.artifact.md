# Implementation Plan - Enhancing Mood Tracker, AI Journal, and Profile Screens

This plan addresses several improvements and fixes for the MindMate app, focusing on data consistency, module functionality, and UI refinements.

## User Review Required

> [!IMPORTANT]
> The "Stability Score" calculation will be implemented as a simple average of mood values (if available) or a default value, as a specific algorithm wasn't provided.
> The Login/Logout functionality in `ProfileScreen` will be mocked in a new `ProfileViewModel` since there's no backend integration yet.

## Proposed Changes

### Mood Tracker & AI Journal Integration

#### [MODIFY] [CreateEntryScreen.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/journal/CreateEntryScreen.kt)
- Update the `onSave` lambda signature to include `type: String`.
- Add a new `ExposedDropdownMenuBox` to allow users to select between "AI Journal" and "Mood Tracker".
- Default the type based on reasonable defaults or user selection.

#### [MODIFY] [MainActivity.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/MainActivity.kt)
- Update the `Routes.CreateEntry` entry in `NavDisplay` to handle the new `type` parameter from `CreateEntryScreen`.
- Ensure the `JournalEntry` object passed to `repository.insertJournalEntry` uses the selected `type`.
- Verify that the filter logic for `HubDashboardScreen` correctly uses "AI Journal" and "Mood Tracker" strings.

---

### Dashboard Stats & List Observation

#### [MODIFY] [HubDashboardViewModel.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/hub/HubDashboardViewModel.kt)
- Add `totalLogs: StateFlow<Int>` derived from `journalEntries`.
- Add `stabilityScore: StateFlow<Int>` calculated from `moodData` (e.g., average of `moodValue * 10`).
- Ensure `journalEntries` and stats are properly observed and updated.

#### [MODIFY] [HubDashboardScreen.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/hub/HubDashboardScreen.kt)
- Remove the search icon from `TopAppBar` in `HubListPane`.
- Update `HubDashboardScreen` and `HubListPane` to accept `stabilityScore` and `totalLogs` as parameters.
- Pass these parameters to `HeroMetricCard`.
- Update `HeroMetricCard` to display the dynamic values instead of hardcoded "85%" and "28 Logs".

---

### Profile Screen Enhancements

#### [NEW] [ProfileViewModel.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/profile/ProfileViewModel.kt)
- Create a `ProfileViewModel` to manage a mocked login state (`isLoggedIn: Boolean`).
- Add functions `login()` and `logout()`.

#### [MODIFY] [ProfileScreen.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/ui/screens/profile/ProfileScreen.kt)
- Update `ProfileScreen` to accept `ProfileViewModel`.
- Add a "Login" or "Logout" button/menu item that toggles the state.
- Conditionally show user info (name, email) only when logged in, or show a "Guest" state.

#### [MODIFY] [MainActivity.kt](file:///G:/mad project/app/src/main/java/com/example/myapplication/MainActivity.kt)
- Provide `ProfileViewModel` to the `Routes.Profile` entry.

## Verification Plan

### Automated Tests
- I will run `./gradlew assembleDebug` to ensure the project still builds.
- If time permits, I'll add a simple unit test for the `stabilityScore` calculation in `HubDashboardViewModel`.

### Manual Verification
1. **Mood/Journal Types:**
   - Open "New Entry" screen.
   - Select "Mood Tracker", save entry.
   - Verify it appears under the "Mood Tracker" filter on the Hub.
   - Repeat for "AI Journal".
2. **Dashboard Stats:**
   - Create a few entries and verify the "Logs" count in the Hero card increases.
3. **UI Tweaks:**
   - Verify the search icon is gone from the Hub dashboard.
4. **Login/Logout:**
   - Go to Profile screen.
   - Click "Login", verify UI changes to logged-in state.
   - Click "Logout", verify UI changes to guest state.
