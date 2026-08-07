package com.example.myapplication.ui.screens.profile

import androidx.lifecycle.ViewModel
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthViewModel : ViewModel() {
    private val auth = FirebaseAuth.getInstance()
    
    private val _currentUser = MutableStateFlow(auth.currentUser)
    val currentUser = _currentUser.asStateFlow()

    fun logout() {
        auth.signOut()
        _currentUser.value = null
    }
    
    // Simplification for redesign demo - in real app, these would navigate to Auth screens
    fun loginMock() {
        // This is just to trigger the UI change for the demo
        // In reality, FirebaseAuth.AuthStateListener would handle this
    }
}
