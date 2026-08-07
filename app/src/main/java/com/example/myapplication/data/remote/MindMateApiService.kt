package com.example.myapplication.data.remote

import com.example.myapplication.data.model.*
import retrofit2.http.*

interface MindMateApiService {
    @GET("journal")
    suspend fun getJournalEntries(): List<JournalEntry>

    @POST("journal")
    suspend fun createJournalEntry(@Body entry: JournalEntry)

    @GET("tasks")
    suspend fun getTasks(): List<Task>

    @POST("tasks")
    suspend fun createTask(@Body task: Task)

    @PUT("tasks/{id}")
    suspend fun updateTask(@Path("id") id: Long, @Body task: Task)

    @DELETE("tasks/{id}")
    suspend fun deleteTask(@Path("id") id: Long)

    @POST("productivity")
    suspend fun logProductivity(@Body log: ProductivityLog)

    @GET("productivity/today")
    suspend fun getTodayProductivity(): ProductivityCounter

    @GET("productivity/history")
    suspend fun getProductivityHistory(): List<ProductivityLog>

    @GET("analytics/correlation")
    suspend fun getAnalyticsCorrelation(): List<CorrelationResult>
}
