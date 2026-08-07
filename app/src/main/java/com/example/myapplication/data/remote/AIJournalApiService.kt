package com.example.myapplication.data.remote

import com.example.myapplication.data.model.JournalRequest
import com.example.myapplication.data.model.JournalResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AIJournalApiService {

    @POST("analyze-journal")
    suspend fun analyzeJournal(
        @Body request: JournalRequest
    ): Response<JournalResponse>
}
