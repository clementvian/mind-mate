package com.example.myapplication.ui.screens.hub.dev

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Code
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.myapplication.data.model.*
import com.example.myapplication.ui.components.GlassCard
import com.example.myapplication.ui.components.PremiumButton
import com.example.myapplication.ui.theme.*

/**
 * Top-level entry point for the module. Drop this straight into a LazyColumn
 * `item { }` on the Hub screen. Owns no state of its own — everything comes
 * from [DevInsightsViewModel] so it survives recomposition/navigation.
 */
@Composable
fun DevProductivityModule(
    viewModel: DevInsightsViewModel,
    modifier: Modifier = Modifier
) {
    val profile by viewModel.devProfile.collectAsState()
    val leetCodeStats by viewModel.leetCodeStats.collectAsState()
    val gitHubStats by viewModel.gitHubStats.collectAsState()
    val todayMinutes by viewModel.todayStudyMinutes.collectAsState()
    val showDialog by viewModel.showSetupDialog.collectAsState()

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        DevModuleHeader(
            displayName = profile.userName.ifBlank { "Developer" },
            onSetupClick = viewModel::openSetupDialog
        )

        if (!profile.isConfigured) {
            DevEmptyStateCard(onSetupClick = viewModel::openSetupDialog)
        } else {
            LeetCodeInsightsCard(
                username = profile.leetCodeUsername,
                state = leetCodeStats,
                onRetry = viewModel::refreshInsights
            )
            GitHubInsightsCard(
                username = profile.githubUsername,
                state = gitHubStats,
                onRetry = viewModel::refreshInsights
            )
        }

        StudyTimeLoggerCard(
            todayMinutes = todayMinutes,
            targetMinutes = profile.dailyStudyTargetMinutes,
            onLogSession = viewModel::logStudySession
        )
    }

    if (showDialog) {
        ProfileSetupDialog(
            initialProfile = profile,
            onDismiss = viewModel::dismissSetupDialog,
            onSave = viewModel::saveProfile
        )
    }
}

@Composable
private fun DevModuleHeader(
    displayName: String,
    onSetupClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PremiumAccent.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.Code, contentDescription = null, tint = PremiumAccent, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    "Developer Hub",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = PremiumText
                )
                Text(
                    "Welcome back, $displayName",
                    style = MaterialTheme.typography.bodySmall,
                    color = PremiumTextSecondary
                )
            }
        }

        // "Profile / Setup Credentials" entry point for this module.
        IconButton(
            onClick = onSetupClick,
            modifier = Modifier
                .clip(CircleShape)
                .background(Color.White)
        ) {
            Icon(Icons.Rounded.Settings, contentDescription = "Setup Credentials", tint = PremiumAccent)
        }
    }
}

@Composable
private fun DevEmptyStateCard(onSetupClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 28) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Rounded.Code,
                contentDescription = null,
                tint = PremiumAccent,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Connect your dev accounts",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = PremiumText
            )
            Text(
                "Link LeetCode & GitHub to see live insights and track study time.",
                style = MaterialTheme.typography.bodyMedium,
                color = PremiumTextSecondary,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
            )
            PremiumButton(onClick = onSetupClick, text = "Setup Credentials", modifier = Modifier.fillMaxWidth())
        }
    }
}

// ---------------------------------------------------------------------------
// Feature A: Profile & Handle Setup
// ---------------------------------------------------------------------------

@Composable
private fun ProfileSetupDialog(
    initialProfile: DevProfile,
    onDismiss: () -> Unit,
    onSave: (DevProfile) -> Unit
) {
    var userName by remember { mutableStateOf(initialProfile.userName) }
    var githubUsername by remember { mutableStateOf(initialProfile.githubUsername) }
    var leetCodeUsername by remember { mutableStateOf(initialProfile.leetCodeUsername) }
    var targetHoursText by remember { mutableStateOf(initialProfile.dailyStudyTargetHours.toString()) }

    val targetHours = targetHoursText.toIntOrNull()
    val isValid = (githubUsername.isNotBlank() || leetCodeUsername.isNotBlank()) &&
        targetHours != null && targetHours in 1..24

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(28.dp),
            color = PremiumCardWhite,
            tonalElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    "Setup Credentials",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = PremiumText
                )
                Text(
                    "Used to fetch your live LeetCode & GitHub stats.",
                    style = MaterialTheme.typography.bodySmall,
                    color = PremiumTextSecondary,
                    modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
                )

                OutlinedTextField(
                    value = userName,
                    onValueChange = { userName = it },
                    label = { Text("User Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = githubUsername,
                    onValueChange = { githubUsername = it },
                    label = { Text("GitHub Username") },
                    leadingIcon = { Icon(Icons.Default.Code, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = leetCodeUsername,
                    onValueChange = { leetCodeUsername = it },
                    label = { Text("LeetCode Username") },
                    leadingIcon = { Icon(Icons.Default.EmojiEvents, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = targetHoursText,
                    onValueChange = { new -> if (new.length <= 2 && new.all(Char::isDigit)) targetHoursText = new },
                    label = { Text("Daily Study Target (Hours)") },
                    leadingIcon = { Icon(Icons.Default.Timer, contentDescription = null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(26.dp)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            onSave(
                                DevProfile(
                                    userName = userName.trim(),
                                    githubUsername = githubUsername.trim(),
                                    leetCodeUsername = leetCodeUsername.trim(),
                                    dailyStudyTargetHours = targetHours ?: 4
                                )
                            )
                        },
                        enabled = isValid,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PremiumAccent)
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Feature B: LeetCode Insights Card
// ---------------------------------------------------------------------------

private val EasyColor = Color(0xFF22C55E)
private val MediumColor = Color(0xFFF59E0B)
private val HardColor = Color(0xFFEF4444)

@Composable
private fun LeetCodeInsightsCard(
    username: String,
    state: ApiResult<LeetCodeStatsResponse>,
    onRetry: () -> Unit
) {
    if (username.isBlank()) return

    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 28) {
        Column(modifier = Modifier.padding(20.dp)) {
            InsightCardHeader(
                icon = Icons.Default.EmojiEvents,
                title = "LeetCode",
                subtitle = "@$username",
                isLoading = state is ApiResult.Loading,
                onRetry = onRetry
            )
            Spacer(modifier = Modifier.height(16.dp))

            when (state) {
                is ApiResult.Success -> {
                    val data = state.data
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            "${data.totalSolved}",
                            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                            color = PremiumText
                        )
                        Text(
                            " / ${data.totalQuestions} solved",
                            style = MaterialTheme.typography.bodyMedium,
                            color = PremiumTextSecondary,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DifficultyPill("Easy", data.easySolved, data.totalEasy, EasyColor, Modifier.weight(1f))
                        DifficultyPill("Medium", data.mediumSolved, data.totalMedium, MediumColor, Modifier.weight(1f))
                        DifficultyPill("Hard", data.hardSolved, data.totalHard, HardColor, Modifier.weight(1f))
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        StatChip(label = "Acceptance", value = "${"%.1f".format(data.acceptanceRate)}%")
                        StatChip(label = "Global Rank", value = "#${data.ranking}")
                    }
                }

                is ApiResult.Error -> InsightErrorRow(message = state.message, onRetry = onRetry)
                is ApiResult.Loading -> InsightLoadingRow()
                ApiResult.Idle -> InsightLoadingRow()
            }
        }
    }
}

@Composable
private fun DifficultyPill(label: String, solved: Int, total: Int, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.Bold)
        Text(
            if (total > 0) "$solved/$total" else "$solved",
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            color = color
        )
    }
}

// ---------------------------------------------------------------------------
// Feature C: GitHub Insights Card
// ---------------------------------------------------------------------------

@Composable
private fun GitHubInsightsCard(
    username: String,
    state: ApiResult<GitHubUserResponse>,
    onRetry: () -> Unit
) {
    if (username.isBlank()) return

    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 28) {
        Column(modifier = Modifier.padding(20.dp)) {
            InsightCardHeader(
                icon = Icons.Default.Terminal,
                title = "GitHub",
                subtitle = "@$username",
                isLoading = state is ApiResult.Loading,
                onRetry = onRetry
            )
            Spacer(modifier = Modifier.height(16.dp))

            when (state) {
                is ApiResult.Success -> {
                    val data = state.data
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (data.avatar_url.isNotBlank()) {
                            AsyncImage(
                                model = data.avatar_url,
                                contentDescription = "GitHub avatar",
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(PremiumSecondary)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                        }
                        Row(
                            modifier = Modifier.weight(1f),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            StatChip(label = "Repos", value = "${data.public_repos}")
                            StatChip(label = "Followers", value = "${data.followers}")
                            StatChip(label = "Following", value = "${data.following}")
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // GitHub's public REST endpoint doesn't expose a commit
                    // streak directly (that needs authenticated GraphQL), so
                    // this is a lightweight activity indicator derived from
                    // repo count as a proxy for "active contributor".
                    val activityLabel = when {
                        data.public_repos >= 20 -> "Highly Active Contributor"
                        data.public_repos >= 5 -> "Active Contributor"
                        else -> "Getting Started"
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(PremiumAccent.copy(alpha = 0.1f))
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.LocalFireDepartment, contentDescription = null, tint = PremiumAccent, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(activityLabel, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold), color = PremiumAccent)
                    }
                }

                is ApiResult.Error -> InsightErrorRow(message = state.message, onRetry = onRetry)
                is ApiResult.Loading -> InsightLoadingRow()
                ApiResult.Idle -> InsightLoadingRow()
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Shared small pieces
// ---------------------------------------------------------------------------

@Composable
private fun InsightCardHeader(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    isLoading: Boolean,
    onRetry: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = PremiumAccent, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = PremiumText)
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary)
            }
        }
        IconButton(onClick = onRetry, enabled = !isLoading) {
            Icon(Icons.Rounded.Refresh, contentDescription = "Refresh", tint = PremiumTextSecondary)
        }
    }
}

@Composable
private fun StatChip(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = PremiumText)
        Text(label, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary)
    }
}

@Composable
private fun InsightLoadingRow() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(modifier = Modifier.size(28.dp), color = PremiumAccent, strokeWidth = 3.dp)
    }
}

@Composable
private fun InsightErrorRow(message: String, onRetry: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            message.ifBlank { "Couldn't load stats" },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.weight(1f)
        )
        TextButton(onClick = onRetry) { Text("Retry") }
    }
}

// ---------------------------------------------------------------------------
// Feature D: Interactive Study Time Logger
// ---------------------------------------------------------------------------

@Composable
private fun StudyTimeLoggerCard(
    todayMinutes: Int,
    targetMinutes: Int,
    onLogSession: (minutes: Int, subject: StudySubject) -> Unit
) {
    var hours by remember { mutableIntStateOf(0) }
    var minutes by remember { mutableIntStateOf(0) }
    var selectedSubject by remember { mutableStateOf(StudySubject.COMPETITIVE_PROGRAMMING) }
    var subjectMenuExpanded by remember { mutableStateOf(false) }
    val view = LocalView.current

    val progress = if (targetMinutes > 0) (todayMinutes.toFloat() / targetMinutes.toFloat()).coerceIn(0f, 1f) else 0f
    val pendingMinutes = hours * 60 + minutes

    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 28) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Study Time Logger", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = PremiumText)
                    Text(
                        "${todayMinutes / 60}h ${todayMinutes % 60}m of ${targetMinutes / 60}h today",
                        style = MaterialTheme.typography.bodySmall,
                        color = PremiumTextSecondary
                    )
                }
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.size(48.dp),
                        color = PremiumAccent,
                        trackColor = PremiumAccent.copy(alpha = 0.1f),
                        strokeWidth = 5.dp
                    )
                    Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = PremiumText)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Subject / tag selector
            ExposedDropdownMenuBox(
                expanded = subjectMenuExpanded,
                onExpandedChange = { subjectMenuExpanded = !subjectMenuExpanded }
            ) {
                OutlinedTextField(
                    value = selectedSubject.label,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Subject") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = subjectMenuExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                ExposedDropdownMenu(
                    expanded = subjectMenuExpanded,
                    onDismissRequest = { subjectMenuExpanded = false }
                ) {
                    StudySubject.entries.forEach { subject ->
                        DropdownMenuItem(
                            text = { Text(subject.label) },
                            onClick = {
                                selectedSubject = subject
                                subjectMenuExpanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Hours / minutes steppers
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TimeStepper(
                    label = "Hours",
                    value = hours,
                    onDecrement = { if (hours > 0) hours-- },
                    onIncrement = { if (hours < 12) hours++ },
                    modifier = Modifier.weight(1f)
                )
                TimeStepper(
                    label = "Minutes",
                    value = minutes,
                    onDecrement = { minutes = if (minutes >= 15) minutes - 15 else 0 },
                    onIncrement = { minutes = if (minutes <= 45) minutes + 15 else 45 },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            PremiumButton(
                onClick = {
                    view.performHapticFeedback(android.view.HapticFeedbackConstants.CONFIRM)
                    onLogSession(pendingMinutes, selectedSubject)
                    hours = 0
                    minutes = 0
                },
                text = if (pendingMinutes > 0) "Log ${pendingMinutes / 60}h ${pendingMinutes % 60}m Session" else "Log Study Session",
                enabled = pendingMinutes > 0,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun TimeStepper(
    label: String,
    value: Int,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(PremiumBackground)
            .padding(vertical = 12.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = PremiumTextSecondary)
        Spacer(modifier = Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(onClick = onDecrement, shape = CircleShape, color = Color.White, modifier = Modifier.size(32.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease $label", tint = PremiumAccent, modifier = Modifier.size(16.dp))
                }
            }
            Text(
                "$value",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = PremiumText,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Surface(onClick = onIncrement, shape = CircleShape, color = PremiumAccent, modifier = Modifier.size(32.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Add, contentDescription = "Increase $label", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}
