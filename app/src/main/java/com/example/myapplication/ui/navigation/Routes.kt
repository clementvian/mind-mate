package com.example.myapplication.ui.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

sealed interface Routes : NavKey {
    @Serializable
    data object Hub : Routes

    @Serializable
    data class EntryDetail(val id: Long) : Routes

    @Serializable
    data object MoodTracker : Routes

    @Serializable
    data object AIJournal : Routes

    @Serializable
    data object CreateEntry : Routes

    @Serializable
    data object Schedule : Routes

    @Serializable
    data object Insights : Routes

    @Serializable
    data object Profile : Routes

    @Serializable
    data object Productivity : Routes
}
