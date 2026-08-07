package com.example.myapplication.ui.screens.journal

object SafetyUtils {
    private val crisisKeywords = listOf(
        "harm", "crisis", "end it", "suicide", "kill myself", 
        "hurt myself", "hopeless", "better off dead"
    )

    fun containsCrisisKeywords(content: String): Boolean {
        val lowerContent = content.lowercase()
        return crisisKeywords.any { it in lowerContent }
    }
}
