package com.example.myapplication.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "productivity_logs")
data class ProductivityLog(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val activityName: String,
    val durationMinutes: Int,
    val timestamp: Long = System.currentTimeMillis()
)
