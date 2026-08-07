package com.example.myapplication.data.local

import androidx.room.*
import com.example.myapplication.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface MindMateDao {
    @Query("SELECT * FROM journal_entries ORDER BY timestamp DESC")
    fun getAllJournalEntries(): Flow<List<JournalEntry>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertJournalEntry(entry: JournalEntry)

    @Delete
    suspend fun deleteJournalEntry(entry: JournalEntry)

    @Query("SELECT * FROM mood_data ORDER BY timestamp DESC")
    fun getAllMoodData(): Flow<List<MoodData>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMoodData(mood: MoodData)

    @Query("SELECT * FROM tasks ORDER BY timestamp DESC")
    fun getAllTasks(): Flow<List<Task>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: Task)

    @Update
    suspend fun updateTask(task: Task)

    @Delete
    suspend fun deleteTask(task: Task)

    @Query("SELECT * FROM productivity_logs ORDER BY timestamp DESC")
    fun getAllProductivityLogs(): Flow<List<ProductivityLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductivityLog(log: ProductivityLog)

    @Query("SELECT * FROM productivity_metrics")
    fun getAllProductivityMetrics(): Flow<List<ProductivityMetric>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductivityMetric(metric: ProductivityMetric)

    @Update
    suspend fun updateProductivityMetric(metric: ProductivityMetric)
}
