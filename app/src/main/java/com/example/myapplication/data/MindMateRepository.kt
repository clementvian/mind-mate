package com.example.myapplication.data

import com.example.myapplication.data.local.MindMateDao
import com.example.myapplication.data.model.*
import com.example.myapplication.data.remote.MindMateApiService
import kotlinx.coroutines.flow.Flow

class MindMateRepository(
    private val dao: MindMateDao,
    private val apiService: MindMateApiService
) {
    val allJournalEntries: Flow<List<JournalEntry>> = dao.getAllJournalEntries()
    val allMoodData: Flow<List<MoodData>> = dao.getAllMoodData()
    val allTasks: Flow<List<Task>> = dao.getAllTasks()
    val allProductivityLogs: Flow<List<ProductivityLog>> = dao.getAllProductivityLogs()
    val allProductivityMetrics: Flow<List<ProductivityMetric>> = dao.getAllProductivityMetrics()

    suspend fun insertProductivityMetric(metric: ProductivityMetric) {
        dao.insertProductivityMetric(metric)
    }

    suspend fun updateProductivityMetric(metric: ProductivityMetric) {
        dao.updateProductivityMetric(metric)
    }

    suspend fun insertJournalEntry(entry: JournalEntry) {
        dao.insertJournalEntry(entry)
        try {
            apiService.createJournalEntry(entry)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun insertMoodData(mood: MoodData) {
        dao.insertMoodData(mood)
    }

    suspend fun refreshJournalEntries() {
        val entries = apiService.getJournalEntries()
        entries.forEach { dao.insertJournalEntry(it) }
    }

    suspend fun insertTask(task: Task) {
        dao.insertTask(task)
        try {
            apiService.createTask(task)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun updateTask(task: Task) {
        dao.updateTask(task)
        try {
            apiService.updateTask(task.id, task)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun deleteTask(task: Task) {
        dao.deleteTask(task)
        try {
            apiService.deleteTask(task.id)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun refreshTasks() {
        try {
            val tasks = apiService.getTasks()
            tasks.forEach { dao.insertTask(it) }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun logProductivity(log: ProductivityLog) {
        dao.insertProductivityLog(log)
        try {
            apiService.logProductivity(log)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getTodayProductivity(): ProductivityCounter? {
        return try {
            apiService.getTodayProductivity()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun refreshProductivityHistory() {
        try {
            val logs = apiService.getProductivityHistory()
            logs.forEach { dao.insertProductivityLog(it) }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getAnalyticsCorrelation(): List<CorrelationResult> {
        return try {
            apiService.getAnalyticsCorrelation()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
}
