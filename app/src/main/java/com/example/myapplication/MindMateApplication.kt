package com.example.myapplication

import android.app.Application
import androidx.room.Room
import com.example.myapplication.data.MindMateRepository
import com.example.myapplication.data.local.MindMateDatabase
import com.example.myapplication.data.remote.MindMateApiService
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class MindMateApplication : Application() {
    lateinit var database: MindMateDatabase
    lateinit var repository: MindMateRepository

    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(
            this,
            MindMateDatabase::class.java,
            "mindmate_db"
        ).fallbackToDestructiveMigration().build()

        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl("http://10.0.2.2:8000/api/")
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        val apiService = retrofit.create(MindMateApiService::class.java)
        repository = MindMateRepository(database.mindMateDao(), apiService)
    }
}
