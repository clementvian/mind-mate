package com.example.myapplication.ui.screens.productivity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.myapplication.data.MindMateRepository

class ProductivityViewModelFactory(
    private val repository: MindMateRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProductivityViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ProductivityViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
