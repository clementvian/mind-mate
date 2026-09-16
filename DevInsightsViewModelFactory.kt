package com.example.myapplication.ui.screens.hub.dev

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.myapplication.data.local.DevPrefsManager
import com.example.myapplication.ui.shared.HubViewModel

class DevInsightsViewModelFactory(
    private val prefsManager: DevPrefsManager,
    private val hubViewModel: HubViewModel
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DevInsightsViewModel::class.java)) {
            return DevInsightsViewModel(prefsManager, hubViewModel) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
