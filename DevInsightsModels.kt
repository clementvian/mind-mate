package com.example.myapplication.data.model

import kotlinx.serialization.Serializable

/**
 * Response shape for https://leetcode-stats-api.herokuapp.com/{username}
 * Extra/unknown fields returned by the API (contributionPoints, reputation,
 * submissionCalendar, etc.) are ignored by the JSON deserializer.
 */
@Serializable
data class LeetCodeStatsResponse(
    val status: String = "",
    val message: String = "",
    val totalSolved: Int = 0,
    val totalQuestions: Int = 0,
    val easySolved: Int = 0,
    val totalEasy: Int = 0,
    val mediumSolved: Int = 0,
    val totalMedium: Int = 0,
    val hardSolved: Int = 0,
    val totalHard: Int = 0,
    val acceptanceRate: Float = 0f,
    val ranking: Long = 0
) {
    val isError: Boolean get() = status.equals("error", ignoreCase = true)
}

/**
 * Response shape for https://api.github.com/users/{username}
 */
@Serializable
data class GitHubUserResponse(
    val login: String = "",
    val name: String? = null,
    val public_repos: Int = 0,
    val followers: Int = 0,
    val following: Int = 0,
    val avatar_url: String = "",
    val html_url: String = "",
    val bio: String? = null
)

/**
 * Locally persisted developer credentials & preferences (SharedPreferences-backed).
 */
data class DevProfile(
    val userName: String = "",
    val githubUsername: String = "",
    val leetCodeUsername: String = "",
    val dailyStudyTargetHours: Int = 4
) {
    val isConfigured: Boolean
        get() = githubUsername.isNotBlank() || leetCodeUsername.isNotBlank()

    val dailyStudyTargetMinutes: Int
        get() = dailyStudyTargetHours.coerceAtLeast(1) * 60
}

/**
 * Subjects/tags a study session can be logged under.
 */
enum class StudySubject(val label: String) {
    COMPETITIVE_PROGRAMMING("Competitive Programming"),
    FULL_STACK_DEV("Full-Stack Dev"),
    OS_DAA("OS / DAA"),
    SYSTEM_DESIGN("System Design"),
    CS_FUNDAMENTALS("CS Fundamentals"),
    OTHER("Other")
}

/**
 * A single logged study session, kept in-memory for the "recent activity" list.
 */
data class StudySession(
    val subject: StudySubject,
    val minutes: Int,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Generic wrapper for asynchronous API-backed state.
 */
sealed class ApiResult<out T> {
    data object Idle : ApiResult<Nothing>()
    data object Loading : ApiResult<Nothing>()
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String) : ApiResult<Nothing>()
}
