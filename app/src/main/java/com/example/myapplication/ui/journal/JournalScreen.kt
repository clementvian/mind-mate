package com.example.myapplication.ui.journal

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.components.PremiumButton
import com.example.myapplication.ui.shared.HubViewModel
import com.example.myapplication.ui.theme.*

@Composable
fun JournalScreen(
    hubViewModel: HubViewModel = viewModel()
) {
    val dailyPrompt by hubViewModel.dailyPrompt.collectAsState()
    val isSubmitting by hubViewModel.isSubmitting.collectAsState()
    
    var journalText by remember { mutableStateOf("") }
    var selectedMood by remember { mutableStateOf("Happy") }
    
    val moods = listOf(
        "Happy" to "😊",
        "Excited" to "😄",
        "Neutral" to "😐",
        "Sad" to "😔",
        "Angry" to "😡",
        "Sleepy" to "😴"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PremiumBackground)
            .padding(horizontal = 24.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Today's Prompt",
            style = MaterialTheme.typography.labelLarge,
            color = PremiumTextSecondary
        )
        
        Text(
            text = "\"$dailyPrompt\"",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.SemiBold,
                color = PremiumText
            ),
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )

        GlassCard(cornerRadius = 32) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "How are you feeling?",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        Icons.Rounded.Mic,
                        contentDescription = "Voice Input",
                        tint = PremiumAccent,
                        modifier = Modifier.clickable { /* Voice to text */ }
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                MoodSelector(
                    moods = moods,
                    selectedMood = selectedMood,
                    onMoodSelected = { selectedMood = it }
                )
                
                Spacer(modifier = Modifier.height(20.dp))
                
                OutlinedTextField(
                    value = journalText,
                    onValueChange = { journalText = it },
                    placeholder = { Text("Write your thoughts here...", color = PremiumTextSecondary) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PremiumAccent,
                        unfocusedBorderColor = Color.Transparent,
                        focusedContainerColor = PremiumBackground.copy(alpha = 0.5f),
                        unfocusedContainerColor = PremiumBackground.copy(alpha = 0.5f)
                    )
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Attachments Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            AttachmentIcon(Icons.Default.PhotoCamera, "Photo")
            AttachmentIcon(Icons.Default.RecordVoiceOver, "Record")
            AttachmentIcon(Icons.Default.LocationOn, "Location")
            AttachmentIcon(Icons.Default.Tag, "Tags")
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        PremiumButton(
            onClick = { 
                hubViewModel.submitJournalEntry(journalText)
                if (!isSubmitting) {
                    journalText = "" // Simple flow: clear after save
                }
            },
            text = "Save Journal",
            modifier = Modifier.fillMaxWidth(),
            isLoading = isSubmitting,
            containerColor = PremiumAccent
        )
        
        Spacer(modifier = Modifier.height(120.dp))
    }
}

@Composable
fun MoodSelector(
    moods: List<Pair<String, String>>,
    selectedMood: String,
    onMoodSelected: (String) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(moods) { (name, emoji) ->
            val isSelected = selectedMood == name
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isSelected) PremiumAccent else Color.White)
                    .clickable { onMoodSelected(name) },
                contentAlignment = Alignment.Center
            ) {
                Text(text = emoji, fontSize = 24.sp)
            }
        }
    }
}

@Composable
fun AttachmentIcon(icon: ImageVector, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = label, tint = PremiumTextSecondary, modifier = Modifier.size(20.dp))
        }
        Text(label, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary, modifier = Modifier.padding(top = 4.dp))
    }
}

@Preview(showBackground = true)
@Composable
fun JournalScreenPreview() {
    MindMateTheme {
        JournalScreen()
    }
}
