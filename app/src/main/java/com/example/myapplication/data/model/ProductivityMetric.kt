package com.example.myapplication.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "productivity_metrics")
data class ProductivityMetric(
    @PrimaryKey
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val currentCount: Int,
    val targetCount: Int,
    val unit: String
)
