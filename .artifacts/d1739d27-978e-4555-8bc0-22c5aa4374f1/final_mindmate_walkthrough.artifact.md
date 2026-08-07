# MindMate - Final Walkthrough

MindMate is a high-fidelity wellness and mental health companion app built with a modern Android stack and an expressive, glassmorphic design language.

## 🌟 Overall Features

### 1. The Hub (Dashboard)
- **Holistic Wellness View**: A centralized dashboard showing "Emotional Balance" and "Stability" metrics.
- **Adaptive Layout**: Utilizes a List-Detail Pane scaffold for seamless transitions between the entry list and detailed views, optimized for both phones and tablets.
- **Recent Activity**: Quick access to recent AI Journal entries and Mood Tracker logs.

### 2. Secure Journaling
- **Biometric Protection**: All sensitive journal entries are shielded by Android Biometric authentication (Fingerprint/Face/PIN).
- **High-Fidelity Detail Screen**: Includes a multi-tab interface for **Journal Entries**, **AI Analysis**, and **CBT Suggestions**.
- **Interactive Metrics**: Real-time consistency score visualization.

### 3. Safety & Intervention
- **Crisis Detection**: Integrated `SafetyUtils` scans for crisis keywords during entry creation.
- **Intervention Flow**: Immediate support dialogs are triggered if concerning patterns are detected, providing a safety net for users.

### 4. Productivity & Schedule
- **Focus Management**: Dedicated productivity module for task tracking and focus sessions.
- **Routine Planning**: A comprehensive schedule view for managing daily wellness routines and habits.

### 5. Insights & Profile
- **Trend Analysis**: Deep-dive analytics into mood patterns and long-term wellness trends.
- **Personalization**: User profile management and app configuration.

---

## 🎨 UI Transformation: Sharp Lavender Glassmorphism

The app features a **"Sharp Glassmorphic"** design, emphasizing visual clarity and modern aesthetics.

- **Theme Palette**: A sophisticated lavender-based theme using `LavenderPrimary` (#DCD6F7) and `DeepPlum` (#1E1926).
- **Glassmorphic Components**: Custom `GlassCard` and `FloatingBottomBar` implementations using semi-transparent overlays (`GlassWhite`) and precise borders.
- **Clarity Optimization**: To ensure maximum legibility and performance, the design utilizes **high-transparency layers without heavy blur effects**, resulting in a "sharp" glass look that remains accessible.
- **Edge-to-Edge**: Full edge-to-edge implementation for an immersive user experience.

---

## 🛠️ Technical Stack

- **UI**: Jetpack Compose with Material 3.
- **Navigation**: **Jetpack Navigation 3** (Route-based navigation with backstack management).
- **Adaptive**: `androidx.compose.material3.adaptive` for multi-pane layouts.
- **Security**: `androidx.biometric:biometric` for secure access control.
- **Persistence**: Room Database for offline-first data management.
- **Networking**: Retrofit for backend synchronization.
- **Architecture**: Clean MVVM (Model-View-ViewModel) with Factory-based dependency injection.

---

## ✅ Validation Results

The application has been validated against the design specifications and technical requirements:

- [x] **Build Status**: Verified via `./gradlew :app:assembleDebug`.
- [x] **Security Audit**: Biometric prompt successfully blocks unauthorized access to journal entries.
- [x] **UI Fidelity**: Navigation 3 and Adaptive Scaffold implementations verified for smooth transitions and layout responsiveness.
- [x] **Safety Check**: Verified that crisis keyword detection correctly triggers intervention dialogs.

---

## 🚀 How to Run the App

1. **Clone the Project**: Open the project folder in **Android Studio (Ladybug or newer)**.
2. **Build**: Run `./gradlew :app:assembleDebug` to ensure all dependencies are resolved.
3. **Deploy**:
   - Connect a physical device or start an emulator (Android 12+ recommended for Dynamic Color support).
   - Click the **"Run"** button in Android Studio or use `adb install app-debug.apk`.
4. **Usage**:
   - Use the **Floating Bottom Bar** to navigate between Hub, Schedule, Productivity, and Insights.
   - Click the **"+"** button in the Hub to create a new Journal Entry (requires Biometric setup on device).
   - Experience the adaptive layout by rotating your device or using a tablet emulator.
