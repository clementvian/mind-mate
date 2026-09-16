package com.example.myapplication.ui.screens.hub.dev

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.local.DevPrefsManager
import com.example.myapplication.data.model.ApiResult
import com.example.myapplication.data.model.DevProfile
import com.example.myapplication.data.model.GitHubUserResponse
import com.example.myapplication.data.model.LeetCodeStatsResponse
import com.example.myapplication.data.model.StudySession
import com.example.myapplication.data.model.StudySubject
import com.example.myapplication.data.remote.DevApiClient
import com.example.myapplication.ui.shared.HubViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Owns all state for the "Developer Productivity & Study Logger" module:
 * - Credential setup (name / GitHub handle / LeetCode handle / daily target)
 * - Live LeetCode + GitHub insights fetched from public REST APIs
 * - A local study-time logger that feeds back into [HubViewModel] so the
 *   app-wide productivity percentage and Stability Score stay in sync.
 */
class DevInsightsViewModel(
    private val prefsManager: DevPrefsManager,
    private val hubViewModel: HubViewModel
) : ViewModel() {

    private val _devProfile = MutableStateFlow(prefsManager.getProfile())
    val devProfile: StateFlow<DevProfile> = _devProfile.asStateFlow()

    private val _leetCodeStats = MutableStateFlow<ApiResult<LeetCodeStatsResponse>>(ApiResult.Idle)
    val leetCodeStats: StateFlow<ApiResult<LeetCodeStatsResponse>> = _leetCodeStats.asStateFlow()

    private val _gitHubStats = MutableStateFlow<ApiResult<GitHubUserResponse>>(ApiResult.Idle)
    val gitHubStats: StateFlow<ApiResult<GitHubUserResponse>> = _gitHubStats.asStateFlow()

    private val _todayStudyMinutes = MutableStateFlow(prefsManager.getTodayStudyMinutes())
    val todayStudyMinutes: StateFlow<Int> = _todayStudyMinutes.asStateFlow()

    private val _recentSessions = MutableStateFlow<List<StudySession>>(emptyList())
    val recentSessions: StateFlow<List<StudySession>> = _recentSessions.asStateFlow()

    private val _showSetupDialog = MutableStateFlow(false)
    val showSetupDialog: StateFlow<Boolean> = _showSetupDialog.asStateFlow()

    init {
        if (_devProfile.value.isConfigured) {
            refreshInsights()
        }
        // Make sure Hub's productivity/stability figures reflect whatever was
        // already logged today, even before any new session is logged.
        pushProductivityToHub()
    }

    fun openSetupDialog() {
        _showSetupDialog.value = true
    }

    fun dismissSetupDialog() {
        _showSetupDialog.value = false
    }

    /** Persists credentials, closes the dialog, and kicks off fresh API fetches. */
    fun saveProfile(profile: DevProfile) {
        prefsManager.saveProfile(profile)
        _devProfile.value = profile
        _showSetupDialog.value = false
        refreshInsights()
        pushProductivityToHub()
    }

    /** Re-fetches both LeetCode and GitHub stats for the currently saved handles. */
    fun refreshInsights() {
        val profile = _devProfile.value
        if (profile.leetCodeUsername.isNotBlank()) fetchLeetCodeStats(profile.leetCodeUsername)
        if (profile.githubUsername.isNotBlank()) fetchGitHubStats(profile.githubUsername)
    }

    private fun fetchLeetCodeStats(username: String) {
        viewModelScope.launch {
            _leetCodeStats.value = ApiResult.Loading
            try {
                val response = DevApiClient.leetCodeApi.getStats(username)
                _leetCodeStats.value = if (response.isError) {
                    ApiResult.Error(response.message.ifBlank { "LeetCode user not found" })
                } else {
                    ApiResult.Success(response)
                }
            } catch (e: Exception) {
                _leetCodeStats.value = ApiResult.Error(e.localizedMessage ?: "Failed to fetch LeetCode stats")
            }
        }
    }

    private fun fetchGitHubStats(username: String) {
        viewModelScope.launch {
            _gitHubStats.value = ApiResult.Loading
            try {
                val response = DevApiClient.gitHubApi.getUser(username)
                _gitHubStats.value = ApiResult.Success(response)
            } catch (e: Exception) {
                _gitHubStats.value = ApiResult.Error(e.localizedMessage ?: "Failed to fetch GitHub stats")
            }
        }
    }

    /**
     * Logs a study session: persists the running daily total, prepends it to
     * the recent-activity list, and pushes the new total into [HubViewModel]
     * so `productivityPct` and the Stability Score recalculate immediately.
     */
    fun logStudySession(minutes: Int, subject: StudySubject) {
        if (minutes <= 0) return
        val updatedTotal = prefsManager.addTodayStudyMinutes(minutes)
        _todayStudyMinutes.value = updatedTotal
        _recentSessions.value = (listOf(StudySession(subject, minutes)) + _recentSessions.value).take(10)
        pushProductivityToHub()
    }

    private fun pushProductivityToHub() {
        hubViewModel.updateProductivity(
            currentSessions = _todayStudyMinutes.value,
            targetSessions = _devProfile.value.dailyStudyTargetMinutes
        )
    }
}
