package com.example.myapplication.ui.screens.hub

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.myapplication.data.MindMateRepository

class HubDashboardViewModelFactory(
    private val repository: MindMateRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(HubDashboardViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return HubDashboardViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
