package com.example.myapplication.ui.screens.hub

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.MindMateRepository
import com.example.myapplication.data.model.JournalEntry
import com.example.myapplication.data.model.MoodData
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class HubDashboardViewModel(
    private val repository: MindMateRepository
) : ViewModel() {
    val journalEntries: StateFlow<List<JournalEntry>> = repository.allJournalEntries
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val moodData: StateFlow<List<MoodData>> = repository.allMoodData
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}
