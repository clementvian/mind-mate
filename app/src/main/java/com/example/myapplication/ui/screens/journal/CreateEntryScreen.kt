package com.example.myapplication.ui.screens.journal

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.myapplication.data.model.JournalEntry
import com.example.myapplication.ui.theme.MindMateTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateEntryScreen(
    onBack: () -> Unit,
    onSave: (String, String, String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf("Neutral") }
    var expanded by remember { mutableStateOf(false) }
    var showCrisisDialog by remember { mutableStateOf(false) }
    
    val view = LocalView.current
    val moods = listOf("Happy", "Sad", "Anxious", "Neutral", "Excited")

    if (showCrisisDialog) {
        CrisisBypassDialog(
            onDismiss = {
                showCrisisDialog = false
                onSave(title, content, mood)
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Entry", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth()
            )

            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = mood,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Mood") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    moods.forEach { selectionOption ->
                        DropdownMenuItem(
                            text = { Text(selectionOption) },
                            onClick = {
                                mood = selectionOption
                                expanded = false
                                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("How are you feeling?") },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )

            Button(
                onClick = {
                    view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                    if (SafetyUtils.containsCrisisKeywords(content)) {
                        showCrisisDialog = true
                    } else {
                        onSave(title, content, mood)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = title.isNotBlank() && content.isNotBlank()
            ) {
                Text("Save Entry")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun CreateEntryScreenPreview() {
    MindMateTheme {
        CreateEntryScreen(onBack = {}, onSave = { _, _, _ -> })
    }
}
