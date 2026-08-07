package com.example.myapplication.ui.journal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.model.JournalRequest
import com.example.myapplication.data.model.JournalResponse
import com.example.myapplication.data.remote.RetrofitInstance
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class JournalUiState {
    object Idle : JournalUiState()
    object Loading : JournalUiState()
    data class Success(val response: JournalResponse) : JournalUiState()
    data class CrisisTriggered(val message: String) : JournalUiState()
    data class Error(val message: String) : JournalUiState()
}

class JournalViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<JournalUiState>(JournalUiState.Idle)
    val uiState: StateFlow<JournalUiState> = _uiState

    fun sendJournalEntry(text: String, productivityPct: Float = 0f) {
        if (text.isBlank()) return

        viewModelScope.launch {
            _uiState.value = JournalUiState.Loading
            try {
                val response = RetrofitInstance.api.analyzeJournal(JournalRequest(text, productivityPct))

                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!

                    if (data.containsCrisis) {
                        _uiState.value = JournalUiState.CrisisTriggered(
                            "Emergency support detected. Please reach out to campus resources."
                        )
                    } else {
                        _uiState.value = JournalUiState.Success(data)
                    }
                } else {
                    _uiState.value = JournalUiState.Error("Server error code: ${response.code()}")
                }
            } catch (e: Exception) {
                _uiState.value = JournalUiState.Error("Connection failed: ${e.localizedMessage}")
            }
        }
    }
}
