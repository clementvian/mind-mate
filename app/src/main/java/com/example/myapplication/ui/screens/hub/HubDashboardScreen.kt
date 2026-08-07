package com.example.myapplication.ui.screens.hub

import androidx.compose.animation.*
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi
import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffold
import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole
import androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication.data.model.JournalEntry
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.components.PremiumButton
import com.example.myapplication.ui.shared.HubViewModel
import com.example.myapplication.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun HubDashboardScreen(
    journalEntries: List<JournalEntry>,
    currentFilter: String,
    onEntryClick: (Long) -> Unit,
    onFilterClick: (String) -> Unit,
    onAIJournalClick: () -> Unit,
    hubViewModel: HubViewModel
) {
    val navigator = rememberListDetailPaneScaffoldNavigator<Long>()
    val scope = rememberCoroutineScope()
    
    val stabilityScore by hubViewModel.stabilityScore.collectAsState()
    val logCount by hubViewModel.logCount.collectAsState()
    val userName by hubViewModel.userName.collectAsState()
    val dailyPrompt by hubViewModel.dailyPrompt.collectAsState()
    val journalingStreak by hubViewModel.journalingStreak.collectAsState()
    val topEmotion by hubViewModel.topEmotion.collectAsState()
    val productivityPct by hubViewModel.productivityPct.collectAsState()

    ListDetailPaneScaffold(
        directive = navigator.scaffoldDirective,
        value = navigator.scaffoldValue,
        listPane = {
            HubListPane(
                userName = userName,
                stabilityScore = stabilityScore,
                logCount = logCount,
                dailyPrompt = dailyPrompt,
                journalingStreak = journalingStreak,
                topEmotion = topEmotion,
                productivityPct = productivityPct,
                journalEntries = journalEntries,
                currentFilter = currentFilter,
                onFilterClick = onFilterClick,
                onEntryClick = { entry ->
                    scope.launch {
                        navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, entry.id)
                    }
                    onEntryClick(entry.id)
                },
                onAIJournalClick = onAIJournalClick,
                hubViewModel = hubViewModel
            )
        },
        detailPane = {
            val entryId = navigator.currentDestination?.contentKey
            val entry = journalEntries.find { it.id == entryId }
            if (entry != null) {
                HubDetailPane(entry)
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Select an entry to see details", color = PremiumTextSecondary)
                }
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HubListPane(
    userName: String,
    stabilityScore: Int,
    logCount: Int,
    dailyPrompt: String,
    journalingStreak: Int,
    topEmotion: String,
    productivityPct: Float,
    journalEntries: List<JournalEntry>,
    currentFilter: String,
    onFilterClick: (String) -> Unit,
    onEntryClick: (JournalEntry) -> Unit,
    onAIJournalClick: () -> Unit,
    hubViewModel: HubViewModel
) {
    Scaffold(
        containerColor = PremiumBackground
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                HubHeader(userName = userName)
            }
            
            item {
                AIJournalPremiumCard(
                    prompt = dailyPrompt,
                    onStartJournaling = onAIJournalClick
                )
            }
            
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    MoodStabilityCard(
                        score = stabilityScore,
                        modifier = Modifier.weight(1f)
                    )
                    ProductivityCard(
                        pct = productivityPct,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            item {
                InsightsPreviewCard(
                    stability = stabilityScore,
                    streak = journalingStreak,
                    topEmotion = topEmotion,
                    onClick = { /* Navigate to Insights */ }
                )
            }

            item {
                FilterSection(currentFilter, onFilterClick)
            }

            if (currentFilter == "All" || currentFilter == "AI Journal") {
                item {
                    QuickJournalCard(hubViewModel = hubViewModel)
                }
            }

            if (journalEntries.isNotEmpty()) {
                item {
                    Text(
                        "Recent Entries",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = PremiumText
                        ),
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
                items(journalEntries) { entry ->
                    JournalEntryItem(entry, onClick = { onEntryClick(entry) })
                }
            }
            
            item {
                Spacer(modifier = Modifier.height(100.dp)) // Space for navigation bar
            }
        }
    }
}

@Composable
fun FilterSection(currentFilter: String, onFilterClick: (String) -> Unit) {
    val filters = listOf("All", "Mood Tracker", "AI Journal")
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(filters) { filter ->
            FilterChip(
                selected = currentFilter == filter,
                onClick = { onFilterClick(filter) },
                label = { Text(filter) },
                shape = RoundedCornerShape(20.dp),
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Color.White,
                    labelColor = PremiumTextSecondary,
                    selectedContainerColor = PremiumAccent,
                    selectedLabelColor = Color.White
                ),
                border = null
            )
        }
    }
}

@Composable
fun QuickJournalCard(hubViewModel: HubViewModel) {
    var text by remember { mutableStateOf("") }
    val isSubmitting by hubViewModel.isSubmitting.collectAsState()

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 28
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                "Quick Log",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = PremiumText
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text("How are you feeling right now?") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 3,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = PremiumBackground,
                    focusedBorderColor = PremiumAccent
                )
            )
            Spacer(modifier = Modifier.height(16.dp))
            PremiumButton(
                onClick = { 
                    hubViewModel.submitJournalEntry(text)
                    text = "" // Clear after submit
                },
                text = "Analyze & Log Entry",
                isLoading = isSubmitting,
                modifier = Modifier.fillMaxWidth(),
                containerColor = Color(0xFF1E1926) // Deep Plum
            )
        }
    }
}

@Composable
fun HubHeader(userName: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Good Morning 👋",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 28.sp,
                    color = PremiumText
                )
            )
            Text(
                text = "Welcome back, $userName",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = PremiumTextSecondary
                )
            )
            Text(
                text = "How are you feeling today?",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = PremiumTextSecondary,
                    fontWeight = FontWeight.Normal
                ),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(PremiumSecondary),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Person,
                contentDescription = "Profile",
                tint = Color.White
            )
        }
    }
}

@Composable
fun AIJournalPremiumCard(
    prompt: String,
    onStartJournaling: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 32
    ) {
        Column(
            modifier = Modifier.padding(24.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Rounded.AutoAwesome,
                    contentDescription = null,
                    tint = PremiumAccent,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "AI Journal",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = PremiumAccent
                    )
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                "Today's Prompt",
                style = MaterialTheme.typography.labelLarge.copy(
                    color = PremiumTextSecondary
                )
            )
            
            Text(
                "\"$prompt\"",
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = PremiumText,
                    lineHeight = 28.sp
                ),
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            PremiumButton(
                onClick = onStartJournaling,
                text = "Start Journaling",
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun MoodStabilityCard(score: Int, modifier: Modifier = Modifier) {
    val animatedScore by animateIntAsState(targetValue = score, label = "Stability")
    
    GlassCard(
        modifier = modifier.height(200.dp),
        cornerRadius = 28
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "Mood Stability",
                style = MaterialTheme.typography.labelLarge,
                color = PremiumTextSecondary
            )
            
            Box(contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { animatedScore / 100f },
                    modifier = Modifier.size(80.dp),
                    color = PremiumPrimary,
                    strokeWidth = 8.dp,
                    trackColor = PremiumPrimary.copy(alpha = 0.1f)
                )
                Text(
                    "$animatedScore%",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = PremiumText
                    )
                )
            }
            
            Text(
                if (score > 80) "Stable" else "Fluctuating",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium,
                    color = PremiumPrimary
                )
            )
        }
    }
}

@Composable
fun ProductivityCard(pct: Float, modifier: Modifier = Modifier) {
    GlassCard(
        modifier = modifier.height(200.dp),
        cornerRadius = 28
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "Productivity",
                style = MaterialTheme.typography.labelLarge,
                color = PremiumTextSecondary
            )
            
            Box(contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { pct / 100f },
                    modifier = Modifier.size(80.dp),
                    color = PremiumAccent,
                    strokeWidth = 8.dp,
                    trackColor = PremiumAccent.copy(alpha = 0.1f)
                )
                Text(
                    "${pct.toInt()}%",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = PremiumText
                    )
                )
            }
            
            Text(
                "+8% this week",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color(0xFF10B981) // Success green
                )
            )
        }
    }
}

@Composable
fun InsightsPreviewCard(
    stability: Int,
    streak: Int,
    topEmotion: String,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        cornerRadius = 28
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Insights",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = PremiumTextSecondary)
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                InsightItem("Mood", "$stability%", modifier = Modifier.weight(1f))
                InsightItem("Streak", "$streak Days", modifier = Modifier.weight(1f))
                InsightItem("Emotion", topEmotion, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun InsightItem(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = PremiumText)
    }
}

@Composable
fun JournalEntryItem(entry: JournalEntry, onClick: () -> Unit) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        cornerRadius = 24
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PremiumPrimary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                val icon = when (entry.type) {
                    "AI Journal" -> Icons.Default.EditNote
                    else -> Icons.Default.Mood
                }
                Icon(
                    icon,
                    contentDescription = null,
                    tint = PremiumPrimary
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    entry.title,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumText)
                )
                Text(
                    entry.type,
                    style = MaterialTheme.typography.bodySmall,
                    color = PremiumTextSecondary
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    entry.mood,
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumAccent)
                )
                Text(
                    formatDate(entry.timestamp),
                    style = MaterialTheme.typography.bodySmall,
                    color = PremiumTextSecondary
                )
            }
        }
    }
}

@Composable
fun HubDetailPane(entry: JournalEntry) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PremiumBackground)
            .padding(24.dp)
    ) {
        Text(
            entry.title,
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold, color = PremiumText)
        )
        Text(
            entry.type,
            style = MaterialTheme.typography.labelLarge,
            color = PremiumAccent
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            formatDate(entry.timestamp),
            style = MaterialTheme.typography.bodySmall,
            color = PremiumTextSecondary
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            entry.content,
            style = MaterialTheme.typography.bodyLarge,
            color = PremiumText
        )
    }
}

fun formatDate(timestamp: Long): String {
    val sdf = SimpleDateFormat("MMM dd", Locale.getDefault())
    return sdf.format(Date(timestamp))
}

@Preview(showBackground = true)
@Composable
fun HubDashboardPreview() {
    MindMateTheme {
        val mockViewModel = HubViewModel() 
        HubDashboardScreen(
            journalEntries = listOf(
                JournalEntry(1, "Morning Reflection", "Feeling calm", "Calm", type = "AI Journal"),
                JournalEntry(3, "Evening Walk", "Beautiful sunset", "Happy", type = "Mood Tracker")
            ),
            currentFilter = "All",
            onEntryClick = {},
            onFilterClick = {},
            onAIJournalClick = {},
            hubViewModel = mockViewModel
        )
    }
}
