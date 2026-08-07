package com.example.myapplication.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "mood_data")
data class MoodData(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val moodValue: Int, // 1-10
    val moodLabel: String,
    val timestamp: Long = System.currentTimeMillis()
)
