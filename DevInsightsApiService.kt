package com.example.myapplication.data.remote

import com.example.myapplication.data.model.GitHubUserResponse
import com.example.myapplication.data.model.LeetCodeStatsResponse
import retrofit2.http.GET
import retrofit2.http.Path

/**
 * https://leetcode-stats-api.herokuapp.com
 */
interface LeetCodeApiService {
    @GET("{username}")
    suspend fun getStats(@Path("username") username: String): LeetCodeStatsResponse
}

/**
 * https://api.github.com
 */
interface GitHubApiService {
    @GET("users/{username}")
    suspend fun getUser(@Path("username") username: String): GitHubUserResponse
}
