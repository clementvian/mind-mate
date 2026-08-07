package com.example.myapplication.ui.screens.productivity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.data.MindMateRepository
import com.example.myapplication.data.model.ProductivityCounter
import com.example.myapplication.data.model.ProductivityLog
import com.example.myapplication.data.model.ProductivityMetric
import com.example.myapplication.data.model.Task
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ProductivityViewModel(
    private val repository: MindMateRepository
) : ViewModel() {

    private val _todayCounter = MutableStateFlow<ProductivityCounter?>(null)
    val todayCounter = _todayCounter.asStateFlow()

    val metrics: StateFlow<List<ProductivityMetric>> = repository.allProductivityMetrics
        .map { list ->
            if (list.isEmpty()) {
                listOf(
                    ProductivityMetric(name = "Study Sessions", currentCount = 4, targetCount = 6, unit = "Sessions"),
                    ProductivityMetric(name = "Deep Work", currentCount = 2, targetCount = 4, unit = "Hours"),
                    ProductivityMetric(name = "Water Intake", currentCount = 5, targetCount = 8, unit = "Glasses")
                ).also { initialList ->
                    initialList.forEach { insertMetric(it) }
                }
            } else list
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        fetchTodayData()
    }

    fun fetchTodayData() {
        viewModelScope.launch {
            _todayCounter.value = repository.getTodayProductivity()
        }
    }

    private fun insertMetric(metric: ProductivityMetric) {
        viewModelScope.launch {
            repository.insertProductivityMetric(metric)
        }
    }

    fun incrementMetric(metricId: String) {
        viewModelScope.launch {
            metrics.value.find { it.id == metricId }?.let { metric ->
                val updatedMetric = metric.copy(currentCount = metric.currentCount + 1)
                repository.updateProductivityMetric(updatedMetric)
                
                // Sync with backend
                repository.logProductivity(
                    ProductivityLog(
                        activityName = metric.name,
                        durationMinutes = 5 // Log as a 5-minute activity increment
                    )
                )
                // Refresh today's stats after sync
                fetchTodayData()
            }
        }
    }

    fun decrementMetric(metricId: String) {
        viewModelScope.launch {
            metrics.value.find { it.id == metricId }?.let { metric ->
                if (metric.currentCount > 0) {
                    val updatedMetric = metric.copy(currentCount = metric.currentCount - 1)
                    repository.updateProductivityMetric(updatedMetric)

                    // Sync with backend (logging a negative activity or just an event)
                    repository.logProductivity(
                        ProductivityLog(
                            activityName = metric.name,
                            durationMinutes = -5 
                        )
                    )
                    // Refresh today's stats after sync
                    fetchTodayData()
                }
            }
        }
    }

    fun addMetric(name: String, target: Int, unit: String) {
        if (name.isBlank() || target <= 0 || unit.isBlank()) {
            return // Basic validation
        }
        
        viewModelScope.launch {
            repository.insertProductivityMetric(
                ProductivityMetric(name = name, targetCount = target, unit = unit, currentCount = 0)
            )
        }
    }

    val tasks: StateFlow<List<Task>> = repository.allTasks
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addTask(title: String, description: String = "") {
        viewModelScope.launch {
            repository.insertTask(Task(title = title, description = description))
        }
    }

    fun toggleTaskCompletion(task: Task) {
        viewModelScope.launch {
            repository.updateTask(task.copy(isCompleted = !task.isCompleted))
        }
    }

    fun deleteTask(task: Task) {
        viewModelScope.launch {
            repository.deleteTask(task)
        }
    }
}
