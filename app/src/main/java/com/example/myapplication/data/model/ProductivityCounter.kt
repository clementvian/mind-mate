package com.example.myapplication.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ProductivityCounter(
    val date: String,
    val totalMinutes: Int,
    val taskCount: Int
)
