package com.example.myapplication.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CorrelationResult(
    val factor: String,
    val correlation: Double
)
