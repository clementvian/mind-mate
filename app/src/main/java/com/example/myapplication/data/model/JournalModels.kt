package com.example.myapplication.data.model

import kotlinx.serialization.Serializable

/**
 * Step 3: Updated Retrofit Data Models
 */

// Payload sent to backend
@Serializable
data class JournalRequest(
    val text: String,
    val productivityPct: Float // Current productivity completion percentage (e.g., 38.0f)
)

// Sentiment breakdown object
@Serializable
data class SentimentScores(
    val valence: String,
    val score: Float
)

// Response received back from backend
@Serializable
data class JournalResponse(
    val containsCrisis: Boolean = false,
    val stabilityScore: Int = 85, // Calculated dynamic score
    val sentimentScores: SentimentScores? = null,
    val detectedDistortions: List<String> = emptyList(),
    val suggestedReframe: String? = null
)
