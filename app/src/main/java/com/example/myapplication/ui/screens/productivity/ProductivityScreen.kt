package com.example.myapplication.ui.screens.productivity

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication.data.model.ProductivityMetric
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.theme.DeepPlum
import com.example.myapplication.ui.theme.LavenderPrimary
import com.example.myapplication.ui.theme.LavenderSecondary

import androidx.compose.ui.tooling.preview.Preview
import com.example.myapplication.ui.theme.MindMateTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductivityScreen(
    viewModel: ProductivityViewModel
) {
    val metrics by viewModel.metrics.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    val view = LocalView.current

    val overallProgress = if (metrics.isNotEmpty()) {
        metrics.map { it.currentCount.toFloat() / it.targetCount.toFloat() }.average().toFloat().coerceIn(0f, 1f)
    } else 0f

    Scaffold(
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets.statusBars
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 100.dp, start = 24.dp, end = 24.dp, top = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                SummaryHeader(overallProgress)
            }

            items(metrics) { metric ->
                MetricCard(
                    metric = metric,
                    onIncrement = {
                        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        viewModel.incrementMetric(metric.id)
                    },
                    onDecrement = {
                        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        viewModel.decrementMetric(metric.id)
                    }
                )
            }

            item {
                CorrelationCard()
            }

            item {
                Button(
                    onClick = { showAddDialog = true },
                    modifier = Modifier.fillMaxWidth().height(64.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = DeepPlum,
                        contentColor = Color.White
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Add Custom Metric", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }

        if (showAddDialog) {
            AddMetricModal(
                onDismiss = { showAddDialog = false },
                onAdd = { name, target, unit ->
                    viewModel.addMetric(name, target, unit)
                    showAddDialog = false
                }
            )
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF3E5F5)
@Composable
fun ProductivityScreenPreview() {
    MindMateTheme {
        // Mock ViewModel or simple UI components
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF3E5F5))) {
            Column(modifier = Modifier.padding(24.dp)) {
                SummaryHeader(0.65f)
                Spacer(Modifier.height(20.dp))
                MetricCard(
                    metric = ProductivityMetric(name = "Study Sessions", currentCount = 4, targetCount = 6, unit = "Sessions"),
                    onIncrement = {},
                    onDecrement = {}
                )
                Spacer(Modifier.height(20.dp))
                CorrelationCard()
            }
        }
    }
}

@Composable
fun SummaryHeader(progress: Float) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "Daily Productivity",
            style = MaterialTheme.typography.displaySmall.copy(
                fontWeight = FontWeight.Black,
                color = DeepPlum,
                letterSpacing = (-1).sp
            )
        )
        Spacer(Modifier.height(24.dp))
        Box(contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                progress = { progress },
                modifier = Modifier.size(160.dp),
                strokeWidth = 12.dp,
                color = LavenderSecondary,
                trackColor = LavenderPrimary.copy(alpha = 0.3f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Text(
                "${(progress * 100).toInt()}%",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = DeepPlum
                )
            )
        }
    }
}

@Composable
fun MetricCard(
    metric: ProductivityMetric,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val progress = (metric.currentCount.toFloat() / metric.targetCount.toFloat()).coerceIn(0f, 1f)
    
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .background(Color.White.copy(alpha = 0.7f)) // Add a bit more white as requested
                .padding(24.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        metric.name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = DeepPlum,
                            fontSize = 18.sp
                        )
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${metric.currentCount} / ${metric.targetCount} ${metric.unit}",
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = DeepPlum.copy(alpha = 0.6f)
                        )
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        onClick = onDecrement,
                        shape = CircleShape,
                        color = DeepPlum,
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Remove, contentDescription = "Decrement", tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Surface(
                        onClick = onIncrement,
                        shape = CircleShape,
                        color = DeepPlum,
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Add, contentDescription = "Increment", tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(5.dp)),
                color = if (progress >= 1f) Color(0xFF4DB6AC) else Color(0xFFF06292), // Mint / Soft Rose
                trackColor = LavenderPrimary.copy(alpha = 0.2f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
        }
    }
}

@Composable
fun CorrelationCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = LavenderPrimary.copy(alpha = 0.4f))
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                "Productivity Insight",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = LavenderSecondary
                )
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "On days where you log 4+ Study Sessions, your Anxiety decreases by 28%.",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    lineHeight = 24.sp,
                    color = DeepPlum
                )
            )
        }
    }
}

@Composable
fun AddMetricModal(
    onDismiss: () -> Unit,
    onAdd: (String, Int, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var target by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Custom Metric", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Metric Name (e.g. Water)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = target,
                    onValueChange = { target = it },
                    label = { Text("Daily Target (e.g. 8)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("Unit (e.g. Glasses)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            val targetInt = target.toIntOrNull()
            val isValid = name.isNotBlank() && unit.isNotBlank() && targetInt != null && targetInt > 0

            TextButton(
                onClick = {
                    if (isValid && targetInt != null) {
                        onAdd(name, targetInt, unit)
                    }
                },
                enabled = isValid
            ) {
                Text("Add", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        shape = RoundedCornerShape(28.dp),
        containerColor = Color.White
    )
}
