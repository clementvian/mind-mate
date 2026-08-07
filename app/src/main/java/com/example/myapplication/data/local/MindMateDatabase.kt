package com.example.myapplication.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.myapplication.data.model.JournalEntry
import com.example.myapplication.data.model.MoodData
import com.example.myapplication.data.model.Task
import com.example.myapplication.data.model.ProductivityLog
import com.example.myapplication.data.model.ProductivityMetric

@Database(entities = [JournalEntry::class, MoodData::class, Task::class, ProductivityLog::class, ProductivityMetric::class], version = 4, exportSchema = false)
abstract class MindMateDatabase : RoomDatabase() {
    abstract fun mindMateDao(): MindMateDao
}
