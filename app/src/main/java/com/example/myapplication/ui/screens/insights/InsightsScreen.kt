package com.example.myapplication.ui.screens.insights

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.theme.*

@Composable
fun InsightsScreen(
    viewModel: InsightsViewModel
) {
    val stabilityScore by viewModel.moodStability.collectAsState()
    val streak by viewModel.journalingStreak.collectAsState()
    val topEmotion by viewModel.topEmotion.collectAsState()
    val emotionBreakdown by viewModel.emotionBreakdown.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(PremiumBackground)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Analytics",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = PremiumText
                )
            )
        }

        item {
            StabilityMetricSection(score = stabilityScore)
        }

        item {
            EmotionBreakdownSection(breakdown = emotionBreakdown)
        }

        item {
            StreakAndSummarySection(streak = streak, topEmotion = topEmotion)
        }

        item {
            RecommendationsSection()
        }
        
        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun StabilityMetricSection(score: Int) {
    GlassCard(cornerRadius = 32) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                "Mood Stability",
                style = MaterialTheme.typography.titleMedium,
                color = PremiumTextSecondary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "$score%",
                    style = MaterialTheme.typography.displayMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = PremiumAccent
                    )
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        "Very Stable",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = PremiumText
                    )
                    Text(
                        "Your emotions have remained balanced.",
                        style = MaterialTheme.typography.bodySmall,
                        color = PremiumTextSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun EmotionBreakdownSection(breakdown: Map<String, Float>) {
    GlassCard(cornerRadius = 32) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                "Emotion Analysis",
                style = MaterialTheme.typography.titleMedium,
                color = PremiumTextSecondary
            )
            Spacer(modifier = Modifier.height(20.dp))
            
            if (breakdown.isEmpty()) {
                Text("Not enough data yet.", color = PremiumTextSecondary)
            } else {
                breakdown.forEach { (emotion, pct) ->
                    EmotionBar(emotion, pct)
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
fun EmotionBar(label: String, percentage: Float) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = PremiumText)
            Text("${(percentage * 100).toInt()}%", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(6.dp))
        LinearProgressIndicator(
            progress = { percentage },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
            color = PremiumPrimary,
            trackColor = PremiumPrimary.copy(alpha = 0.1f),
            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
        )
    }
}

@Composable
fun StreakAndSummarySection(streak: Int, topEmotion: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        GlassCard(modifier = Modifier.weight(1f), cornerRadius = 28) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Streak", style = MaterialTheme.typography.labelLarge, color = PremiumTextSecondary)
                Text("$streak Days", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
        }
        GlassCard(modifier = Modifier.weight(1f), cornerRadius = 28) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Top Mood", style = MaterialTheme.typography.labelLarge, color = PremiumTextSecondary)
                Text(topEmotion, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun RecommendationsSection() {
    Column {
        Text(
            "AI Recommendations",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            color = PremiumText,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            item { RecommendationCard("Short Walk", "Clear your mind", Icons.Default.DirectionsWalk) }
            item { RecommendationCard("Breathing", "Reduce stress", Icons.Default.Air) }
            item { RecommendationCard("Music", "Calming beats", Icons.Default.MusicNote) }
        }
    }
}

@Composable
fun RecommendationCard(title: String, desc: String, icon: ImageVector) {
    GlassCard(modifier = Modifier.width(160.dp), cornerRadius = 24) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(PremiumSecondary.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = PremiumAccent)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
            Text(desc, style = MaterialTheme.typography.bodySmall, color = PremiumTextSecondary)
        }
    }
}
