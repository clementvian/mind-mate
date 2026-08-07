package com.example.myapplication.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.components.PremiumButton
import com.example.myapplication.ui.shared.HubViewModel
import com.example.myapplication.ui.theme.*

@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel = viewModel(),
    hubViewModel: HubViewModel = viewModel()
) {
    val user by authViewModel.currentUser.collectAsState()
    val stabilityScore by hubViewModel.stabilityScore.collectAsState()
    val productivityPct by hubViewModel.productivityPct.collectAsState()
    val streak by hubViewModel.journalingStreak.collectAsState()
    val logCount by hubViewModel.logCount.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(PremiumBackground)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        if (user == null) {
            item {
                Spacer(modifier = Modifier.height(100.dp))
                UnauthenticatedView()
            }
        } else {
            item {
                Spacer(modifier = Modifier.height(40.dp))
                ProfileHeader(
                    name = user?.displayName ?: "Jane Doe",
                    email = user?.email ?: "jane.doe@example.com"
                )
            }
            
            item {
                StatsGrid(
                    stability = stabilityScore,
                    productivity = productivityPct.toInt(),
                    streak = streak,
                    total = logCount
                )
            }

            item {
                SettingsSection(onLogout = { authViewModel.logout() })
            }
        }
        
        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun UnauthenticatedView() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(PremiumSecondary.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Lock, contentDescription = null, tint = PremiumAccent, modifier = Modifier.size(64.dp))
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Text(
            text = "Welcome!",
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = PremiumText
        )
        
        Text(
            text = "Log in to sync your journals across devices.",
            style = MaterialTheme.typography.bodyLarge,
            color = PremiumTextSecondary,
            modifier = Modifier.padding(top = 8.dp, bottom = 40.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        
        PremiumButton(
            onClick = { /* Navigate to Login */ },
            text = "Login",
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedButton(
            onClick = { /* Navigate to Signup */ },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(28.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, PremiumAccent)
        ) {
            Text("Sign Up", color = PremiumAccent, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
fun ProfileHeader(name: String, email: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(PremiumPrimary),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(60.dp))
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = name,
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = PremiumText
        )
        Text(
            text = email,
            style = MaterialTheme.typography.bodyMedium,
            color = PremiumTextSecondary
        )
    }
}

@Composable
fun StatsGrid(stability: Int, productivity: Int, streak: Int, total: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatCard(label = "Stability", value = "$stability%", modifier = Modifier.weight(1f))
            StatCard(label = "Productivity", value = "$productivity%", modifier = Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatCard(label = "Streak", value = "$streak Days", modifier = Modifier.weight(1f))
            StatCard(label = "Total Logs", value = "$total", modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier, cornerRadius = 24) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = PremiumText)
        }
    }
}

@Composable
fun SettingsSection(onLogout: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Account Settings",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(vertical = 8.dp)
        )
        
        ProfileMenuItem(icon = Icons.Default.Edit, label = "Edit Profile")
        ProfileMenuItem(icon = Icons.Default.DarkMode, label = "Dark Mode")
        ProfileMenuItem(icon = Icons.Default.Notifications, label = "Notifications")
        ProfileMenuItem(icon = Icons.Default.CloudUpload, label = "Backup & Sync")
        ProfileMenuItem(
            icon = Icons.AutoMirrored.Filled.Logout, 
            label = "Logout", 
            color = MaterialTheme.colorScheme.error,
            onClick = onLogout
        )
    }
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector, 
    label: String, 
    color: Color = PremiumText,
    onClick: () -> Unit = {}
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onClick() }, cornerRadius = 20) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = if (color == PremiumText) PremiumPrimary else color)
            Spacer(modifier = Modifier.width(16.dp))
            Text(text = label, style = MaterialTheme.typography.bodyLarge, color = color)
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = PremiumTextSecondary)
        }
    }
}
