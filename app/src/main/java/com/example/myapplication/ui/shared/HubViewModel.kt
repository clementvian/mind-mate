package com.example.myapplication.ui.shared

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.model.JournalRequest
import com.example.myapplication.data.model.JournalResponse
import com.example.myapplication.data.remote.RetrofitInstance
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Step 4: Shared State & ViewModel Orchestration
 */
class HubViewModel : ViewModel() {

    // --- State Flow Variables ---
    private val _stabilityScore = MutableStateFlow(85)
    val stabilityScore: StateFlow<Int> = _stabilityScore.asStateFlow()

    private val _productivityPct = MutableStateFlow(38.0f)
    val productivityPct: StateFlow<Float> = _productivityPct.asStateFlow()

    private val _logCount = MutableStateFlow(28)
    val logCount: StateFlow<Int> = _logCount.asStateFlow()

    private val _dailyPrompt = MutableStateFlow("What made you smile today?")
    val dailyPrompt: StateFlow<String> = _dailyPrompt.asStateFlow()

    private val _journalingStreak = MutableStateFlow(18)
    val journalingStreak: StateFlow<Int> = _journalingStreak.asStateFlow()

    private val _topEmotion = MutableStateFlow("Happy")
    val topEmotion: StateFlow<String> = _topEmotion.asStateFlow()

    private val _userName = MutableStateFlow("Anna")
    val userName: StateFlow<String> = _userName.asStateFlow()

    // UI Feedback State (Optional, but good for UX)
    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // --- ViewModel Functions ---

    /**
     * Calculates the new productivity completion percentage and estimates local stability score.
     */
    fun updateProductivity(currentSessions: Int, targetSessions: Int) {
        if (targetSessions <= 0) return
        
        val newPct = (currentSessions.toFloat() / targetSessions.toFloat()) * 100f
        _productivityPct.value = newPct

        // Recalculate a quick local estimated stabilityScore (Heuristic)
        // For example: Stability score improves as productivity gets closer to target
        val baseScore = 70 // Base stability
        val bonus = (newPct * 0.3f).toInt() // Max bonus of 30 points
        _stabilityScore.value = (baseScore + bonus).coerceAtMost(100)
    }

    /**
     * Submits a journal entry and updates global state based on server response.
     */
    fun submitJournalEntry(text: String) {
        if (text.isBlank()) {
            _errorMessage.value = "Journal text cannot be empty"
            return
        }

        viewModelScope.launch {
            _isSubmitting.value = true
            _errorMessage.value = null
            
            try {
                val request = JournalRequest(
                    text = text,
                    productivityPct = _productivityPct.value
                )
                
                val response = RetrofitInstance.api.analyzeJournal(request)

                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    
                    // a. Updates stabilityScore state with response
                    _stabilityScore.value = data.stabilityScore
                    
                    // b. Increments logCount state by 1
                    _logCount.value += 1
                } else {
                    _errorMessage.value = "Server error: ${response.code()}"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Connection failed: ${e.localizedMessage}"
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    // Function to clear error message
    fun clearError() {
        _errorMessage.value = null
    }
}
