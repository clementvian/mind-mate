package com.example.myapplication.ui.screens.insights

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.MindMateRepository
import com.example.myapplication.data.model.JournalEntry
import kotlinx.coroutines.flow.*

class InsightsViewModel(
    private val repository: MindMateRepository
) : ViewModel() {

    private val _entries = repository.allJournalEntries

    val moodStability = _entries.map { entries ->
        calculateStability(entries)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 85)

    val journalingStreak = _entries.map { entries ->
        calculateStreak(entries)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val topEmotion = _entries.map { entries ->
        entries.groupBy { it.mood }
            .maxByOrNull { it.value.size }?.key ?: "N/A"
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "Calm")

    val emotionBreakdown = _entries.map { entries ->
        val total = entries.size.toFloat()
        if (total == 0f) return@map emptyMap<String, Float>()
        entries.groupBy { it.mood }.mapValues { it.value.size / total }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    private fun calculateStability(entries: List<JournalEntry>): Int {
        if (entries.isEmpty()) return 85
        // Heuristic: consistency of mood labels
        val uniqueMoods = entries.take(7).map { it.mood }.distinct().size
        return (100 - (uniqueMoods * 10)).coerceAtLeast(50)
    }

    private fun calculateStreak(entries: List<JournalEntry>): Int {
        if (entries.isEmpty()) return 0
        // Simplified streak logic based on timestamps (sorted)
        val dates = entries.map { 
            java.time.LocalDate.ofInstant(
                java.time.Instant.ofEpochMilli(it.timestamp), 
                java.time.ZoneId.systemDefault()
            ) 
        }.distinct().sortedDescending()
        
        var streak = 0
        var current = java.time.LocalDate.now()
        
        for (date in dates) {
            if (date == current || date == current.minusDays(1)) {
                streak++
                current = date
            } else {
                break
            }
        }
        return streak
    }
}
