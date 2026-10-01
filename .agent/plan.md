# Project Plan

Update the MindMate UI and fix the broken/missing modules (Insights, Schedule, Profile). 

UI Inspiration:
- Glassmorphic translucent surfaces.
- Soft lavender/pastel color palette.
- Floating bottom navigation with a central active state.
- Large quantitative typography (progress percentages).
- Distinct schedule/calendar view.

Fixes:
- Ensure all bottom navigation tabs (Hub, Schedule, Insights, Profile) work.
- Connect filter chips to respective views.
- Handle biometric authentication gracefully (provide fallback or mock for testing if needed).
- Fix adaptive layout for list-detail views on large screens.

## Project Brief

# MindMate Project Brief

## Features
1. **Interactive Glassmorphic Dashboard (Hub)**: A central landing page utilizing glassmorphic translucent surfaces and large quantitative typography to display mental health progress percentages at a glance.
2. **Adaptive Schedule & Calendar**: A dedicated module for managing daily routines and appointments, featuring a calendar view that seamlessly transitions to a list-detail layout on large screens.
3. **Data-Driven Insights**: A visual analytics screen providing trends and progress summaries using a soft lavender and pastel color palette.
4. **State-Driven Navigation**: A floating bottom navigation bar with a central active state, powered by Jetpack Navigation 3 to manage the Hub, Schedule, Insights, and Profile tabs.
5. **Biometric S
6. ecurity**: Secure user access via biometric authentication, including a fallback/mock implementation for development and testing.

## High-Level Technical Stack
- **Kotlin**: Core programming language for app logic.
- **Jetpack Compose**: Modern toolkit for building the glassmorphic and pastel-themed UI.
- **Jetpack Navigation 3**: State-driven navigation framework for managing app-wide transitions and deep linking.
- **Compose Material Adaptive**: Library used to implement adaptive layouts, ensuring a responsive experience across phones, tablets, and foldables (e.g., List-Detail panes).
- **Coroutines**: For managing asynchronous operations and UI state updates.
- **Biometric API**: For secure authentication and privacy.

> [!NOTE]
> This MVP focuses on UI restoration and adaptive layout fixes, ensuring all primary navigation modules (Hub, Schedule, Insights, Profile) are fully functional and visually consistent with the glassmorphic design language.

## Implementation Steps
**Total Duration:** 6h 13m 31s

### 1: Develop Backend: Mongoose Model and Express Routes
- **Status:** COMPLETED
- **Updates:** Created backend directory with Mongoose model 'ProductivityLog.js' and Express routes 'productivity.js' as specified. Indexed for performance.
- **Acceptance Criteria:**
  - ProductivityLog.js exists with specified schema
  - productivity.js routes handle log, today, history, and correlation endpoints

### 2: Implement Android Data Layer: Models and API
- **Status:** COMPLETED
- **Updates:** Implemented ProductivityLog and ProductivityCounter data models. Updated MindMateApiService with REST endpoints and MindMateRepository with data handling logic. Updated Room database to persist productivity logs.
- **Acceptance Criteria:**
  - ProductivityLog/Counter data classes created
  - MindMateApiService updated with productivity endpoints
  - MindMateRepository supports productivity sync

### 3: Build Productivity UI: Components and Screen
- **Status:** COMPLETED
- **Updates:** Implemented ProductivityScreen.kt with glassmorphic design, including a ring progress header, stepper-controlled counter cards with haptic feedback, a correlation card, and an add-metric dialog. ProductivityViewModel handles the state and syncing.
- **Acceptance Criteria:**
  - ProductivityScreen.kt implemented with Glassmorphic design
  - DailyCounterCard with stepper controls and haptic feedback
  - Summary header with ring progress
  - Correlation card and Add Custom Metric dialog functional

### 4: Integrate and Verify Navigation
- **Status:** COMPLETED
- **Updates:** Verified 'Productivity' route in Routes.kt and updated FloatingBottomBar in MainActivity.kt with Icons.Rounded.Assessment. Navigation is functional and reflects the active state.
- **Acceptance Criteria:**
  - Productivity tab is correctly integrated into the floating bottom bar
  - Navigation to and from ProductivityScreen works flawlessly

### 5: Final Verification and Demo
- **Status:** COMPLETED
- **Updates:** Fixed serialization crash by migrating Retrofit to Kotlinx Serialization. Verified backend sync, input validation, and full navigation stability. Productivity module is fully functional with glassmorphic UI and haptics.
- **Acceptance Criteria:**
  - Build passes
  - All features (stepper, haptics, analytics) verified by critic_agent
  - No crashes observed

### Task_6_RefactorGlassmorphicComponents: Refactor Glassmorphic components to remove global blur effects and refine translucent UI.
- **Status:** COMPLETED
- **Updates:** Removed all occurrences of Modifier.blur from GlassCard and FloatingBottomBar. Adjusted background transparency to maintain a translucent aesthetic without blurring the content. Cleaned up unused imports across the project. UI is now sharp and readable.
- **Acceptance Criteria:**
  - Modifier.blur() removed from GlassCard in GlassComponents.kt
  - Modifier.blur() removed from FloatingBottomBar in MainActivity.kt
  - Unused blur imports cleaned up across the project
  - UI maintain translucent appearance using semi-transparent colors

### Task_7_FinalRunAndVerify: Final Run and Verify: Ensure UI clarity and application stability.
- **Status:** COMPLETED
- **Updates:** The critic_agent successfully verified the MindMate application. The UI is sharp and readable after removing the problematic blur modifiers. All modules (Hub, Productivity, Schedule, Insights, Profile) are functional, and navigation is stable without crashes. Productivity counters and haptic triggers were confirmed. Project is complete.
- **Acceptance Criteria:**
  - Build pass
  - App does not crash
  - UI is sharp, readable, and free of global blur artifacts
  - Critic_agent verifies application stability and alignment with requirements
- **Duration:** 6h 13m 31s

