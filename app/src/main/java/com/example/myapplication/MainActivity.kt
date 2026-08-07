package com.example.myapplication

import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material.icons.automirrored.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.lifecycleScope
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.myapplication.data.model.JournalEntry
import com.example.myapplication.ui.navigation.Routes
import com.example.myapplication.ui.journal.JournalScreen
import com.example.myapplication.ui.screens.hub.HubDashboardScreen
import com.example.myapplication.ui.screens.hub.HubDashboardViewModel
import com.example.myapplication.ui.screens.hub.HubDashboardViewModelFactory
import com.example.myapplication.ui.screens.journal.JournalDetailScreen
import com.example.myapplication.ui.screens.insights.InsightsScreen
import com.example.myapplication.ui.screens.insights.InsightsViewModel
import com.example.myapplication.ui.screens.insights.InsightsViewModelFactory
import com.example.myapplication.ui.screens.profile.ProfileScreen
import com.example.myapplication.ui.screens.profile.AuthViewModel
import com.example.myapplication.ui.theme.*
import com.example.myapplication.ui.shared.HubViewModel
import com.example.myapplication.ui.security.BiometricAuthenticator
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val repository = (application as MindMateApplication).repository
        val biometricAuthenticator = BiometricAuthenticator(this)

        setContent {
            MindMateTheme {
                val sharedHubViewModel: HubViewModel = viewModel()
                val authViewModel: AuthViewModel = viewModel()
                val backStack = rememberNavBackStack(Routes.Hub)
                
                val entriesProvider = remember {
                    entryProvider<NavKey> {
                        entry<Routes.Hub> {
                            val viewModel: HubDashboardViewModel = viewModel(
                                factory = HubDashboardViewModelFactory(repository)
                            )
                            val entries by viewModel.journalEntries.collectAsState()
                            var filter by remember { mutableStateOf("All") }
                            
                            HubDashboardScreen(
                                journalEntries = entries,
                                currentFilter = filter,
                                onFilterClick = { filter = it },
                                onEntryClick = { id ->
                                    backStack.add(Routes.EntryDetail(id))
                                },
                                onAIJournalClick = {
                                    backStack.add(Routes.AIJournal)
                                },
                                hubViewModel = sharedHubViewModel
                            )
                        }

                        entry<Routes.AIJournal> {
                            JournalScreen(hubViewModel = sharedHubViewModel)
                        }

                        entry<Routes.Insights> {
                            val viewModel: InsightsViewModel = viewModel(
                                factory = InsightsViewModelFactory(repository)
                            )
                            InsightsScreen(viewModel = viewModel)
                        }

                        entry<Routes.Profile> {
                            ProfileScreen(
                                authViewModel = authViewModel,
                                hubViewModel = sharedHubViewModel
                            )
                        }

                        entry<Routes.EntryDetail> { key ->
                            val viewModel: HubDashboardViewModel = viewModel(
                                factory = HubDashboardViewModelFactory(repository)
                            )
                            val entries by viewModel.journalEntries.collectAsState()
                            val entry = entries.find { it.id == key.id }
                            
                            if (entry != null) {
                                JournalDetailScreen(
                                    entry = entry,
                                    onBack = { backStack.removeLastOrNull() }
                                )
                            }
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        NavDisplay(
                            backStack = backStack,
                            onBack = { backStack.removeLastOrNull() },
                            entryProvider = entriesProvider
                        )

                        // Premium Floating Navigation Bar
                        val currentRoute = backStack.lastOrNull()
                        val showBottomBar = currentRoute in listOf(Routes.Hub, Routes.AIJournal, Routes.Insights, Routes.Profile)
                        
                        if (showBottomBar) {
                            PremiumBottomBar(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 32.dp),
                                currentRoute = currentRoute as Routes,
                                onTabSelected = { route ->
                                    // Logic to clear stack and switch tabs
                                    while (backStack.size > 1) {
                                        backStack.removeLastOrNull()
                                    }
                                    if (route != Routes.Hub) {
                                        backStack.add(route)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumBottomBar(
    modifier: Modifier = Modifier,
    currentRoute: Routes,
    onTabSelected: (Routes) -> Unit
) {
    Box(
        modifier = modifier
            .padding(horizontal = 24.dp)
            .height(80.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(40.dp))
            .background(Color.White.copy(alpha = 0.9f))
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            BottomNavItem(
                icon = Icons.Default.Home,
                label = "Home",
                isSelected = currentRoute == Routes.Hub,
                onClick = { onTabSelected(Routes.Hub) }
            )
            BottomNavItem(
                icon = Icons.Default.Book,
                label = "Journal",
                isSelected = currentRoute == Routes.AIJournal,
                onClick = { onTabSelected(Routes.AIJournal) }
            )
            BottomNavItem(
                icon = Icons.Default.BarChart,
                label = "Insights",
                isSelected = currentRoute == Routes.Insights,
                onClick = { onTabSelected(Routes.Insights) }
            )
            BottomNavItem(
                icon = Icons.Default.Person,
                label = "Profile",
                isSelected = currentRoute == Routes.Profile,
                onClick = { onTabSelected(Routes.Profile) }
            )
        }
    }
}

@Composable
fun BottomNavItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(CircleShape)
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected) PremiumAccent else PremiumTextSecondary,
            modifier = Modifier.size(28.dp)
        )
        if (isSelected) {
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .size(4.dp)
                    .clip(CircleShape)
                    .background(PremiumAccent)
            )
        }
    }
}
