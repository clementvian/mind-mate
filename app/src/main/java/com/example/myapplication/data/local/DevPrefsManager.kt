package com.example.myapplication.data.local

import android.content.Context
import androidx.core.content.edit
import com.example.myapplication.data.model.DevProfile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Simple SharedPreferences-backed persistence for the Developer Productivity
 * module: user credentials (GitHub / LeetCode handles, name, daily target)
 * and a running total of study minutes logged "today".
 *
 * Daily totals are keyed by calendar date so they naturally reset each day
 * without needing a background job.
 */
class DevPrefsManager(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getProfile(): DevProfile = DevProfile(
        userName = prefs.getString(KEY_USER_NAME, "") ?: "",
        githubUsername = prefs.getString(KEY_GITHUB, "") ?: "",
        leetCodeUsername = prefs.getString(KEY_LEETCODE, "") ?: "",
        dailyStudyTargetHours = prefs.getInt(KEY_TARGET_HOURS, 4)
    )

    fun saveProfile(profile: DevProfile) {
        prefs.edit {
            putString(KEY_USER_NAME, profile.userName.trim())
            putString(KEY_GITHUB, profile.githubUsername.trim())
            putString(KEY_LEETCODE, profile.leetCodeUsername.trim())
            putInt(KEY_TARGET_HOURS, profile.dailyStudyTargetHours.coerceIn(1, 24))
        }
    }

    fun getTodayStudyMinutes(): Int = prefs.getInt(todayKey(), 0)

    /** Adds [minutes] to today's running total and returns the new total. */
    fun addTodayStudyMinutes(minutes: Int): Int {
        val updated = (getTodayStudyMinutes() + minutes).coerceAtLeast(0)
        prefs.edit { putInt(todayKey(), updated) }
        return updated
    }

    private fun todayKey(): String {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        return "$KEY_STUDY_MINUTES_PREFIX$today"
    }

    companion object {
        private const val PREFS_NAME = "mindmate_dev_prefs"
        private const val KEY_USER_NAME = "dev_user_name"
        private const val KEY_GITHUB = "dev_github_username"
        private const val KEY_LEETCODE = "dev_leetcode_username"
        private const val KEY_TARGET_HOURS = "dev_daily_target_hours"
        private const val KEY_STUDY_MINUTES_PREFIX = "dev_study_minutes_"
    }
}
