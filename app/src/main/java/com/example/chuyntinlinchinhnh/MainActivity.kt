package com.example.chuyntinlinchinhnh

import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.chuyntinlinchinhnh.data.model.Account
import com.example.chuyntinlinchinhnh.data.model.Transaction
import com.example.chuyntinlinchinhnh.ui.*
import com.example.chuyntinlinchinhnh.ui.theme.BankingAppTheme
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

sealed class Screen {
    object Dashboard : Screen()
    object Transfer : Screen()
    object History : Screen()
}

@OptIn(ExperimentalMaterial3Api::class)
class MainActivity : ComponentActivity() {
    private val viewModel: BankingViewModel by viewModels()

    private val localNetworkPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        viewModel.start()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestLocalNetworkAccessThenConnect()
        enableEdgeToEdge()
        setContent {
            BankingAppTheme {
                val authState by viewModel.authState.collectAsState()
                var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }

                if (authState is AuthState.LoggedIn) {
                    when (currentScreen) {
                        is Screen.Dashboard, is Screen.History -> {
                            Scaffold(
                                modifier = Modifier.fillMaxSize(),
                                topBar = {
                                    CenterAlignedTopAppBar(
                                        title = { Text("Digital Banking", fontWeight = FontWeight.Bold) },
                                        actions = {
                                            IconButton(onClick = { 
                                                currentScreen = if (currentScreen is Screen.Dashboard) Screen.History else Screen.Dashboard 
                                            }) {
                                                Text(if (currentScreen is Screen.Dashboard) "📜" else "🏠")
                                            }
                                            IconButton(onClick = { viewModel.logout() }) {
                                                Text("Logout", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                                            }
                                        }
                                    )
                                },
                                floatingActionButton = {
                                    if (currentScreen is Screen.Dashboard) {
                                        ExtendedFloatingActionButton(
                                            onClick = { currentScreen = Screen.Transfer },
                                            icon = { Text("💸") },
                                            text = { Text("Chuyển tiền") }
                                        )
                                    }
                                }
                            ) { innerPadding ->
                                if (currentScreen is Screen.Dashboard) {
                                    DashboardScreen(
                                        viewModel = viewModel,
                                        modifier = Modifier.padding(innerPadding)
                                    )
                                } else {
                                    HistoryScreen(
                                        viewModel = viewModel,
                                        modifier = Modifier.padding(innerPadding)
                                    )
                                }
                            }
                        }
                        is Screen.Transfer -> {
                            TransferScreen(
                                viewModel = viewModel,
                                onBack = {
                                    viewModel.resetTransferState()
                                    currentScreen = Screen.Dashboard
                                }
                            )
                        }
                    }
                } else {
                    LoginScreen(viewModel = viewModel)
                }
            }
        }
    }

    private fun requestLocalNetworkAccessThenConnect() {
        if (Build.VERSION.SDK_INT >= 37) {
            val permission = "android.permission.ACCESS_LOCAL_NETWORK"
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                localNetworkPermissionLauncher.launch(permission)
                return
            }
        }
        viewModel.start()
    }
}

@Composable
fun LoginScreen(viewModel: BankingViewModel) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val loginError by viewModel.loginErrorMessage.collectAsState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "DIGITAL BANKING",
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 48.dp)
            )

            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    val description = if (passwordVisible) "Hide password" else "Show password"
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Text(if (passwordVisible) "👁️" else "🙈")
                    }
                }
            )

            loginError?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 16.dp),
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { viewModel.login(username, password) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text("Đăng nhập", fontSize = 18.sp)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransferScreen(viewModel: BankingViewModel, onBack: () -> Unit) {
    val accountState by viewModel.accountUiState.collectAsState()
    val transferState by viewModel.transferUiState.collectAsState()
    val destAccounts by viewModel.destinationAccounts.collectAsState()
    val isFetchingDest by viewModel.isFetchingDestAccounts.collectAsState()

    var sourceAccount by remember { mutableStateOf<Account?>(null) }
    var destBranch by remember { mutableStateOf<String?>(null) }
    var destAccount by remember { mutableStateOf<Account?>(null) }
    var amountText by remember { mutableStateOf("") }
    var showConfirmDialog by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    val accounts = if (accountState is AccountUiState.Success) (accountState as AccountUiState.Success).accounts else emptyList()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chuyển tiền") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("⬅️")
                    }
                }
            )
        }
    ) { padding ->
        if (transferState is TransferUiState.Success) {
            val success = transferState as TransferUiState.Success
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Text("✅", fontSize = 64.sp)
                    Text("Giao dịch thành công", style = MaterialTheme.typography.headlineSmall)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Mã giao dịch:", style = MaterialTheme.typography.labelLarge)
                    Text(success.transactionId, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = success.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Hoàn tất") }
                }
            }
        } else if (transferState is TransferUiState.Aborted) {
            val aborted = transferState as TransferUiState.Aborted
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Text("❌", fontSize = 64.sp)
                    Text("Giao dịch bị hủy (ABORTED)", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Mã giao dịch:", style = MaterialTheme.typography.labelLarge)
                    Text(aborted.transactionId, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = aborted.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Quay về Dashboard") }
                }
            }
        } else if (transferState is TransferUiState.Pending) {
            val pending = transferState as TransferUiState.Pending
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Text("⏳", fontSize = 64.sp)
                    Text("Giao dịch đang cam kết (COMMITTING)", style = MaterialTheme.typography.headlineSmall, color = Color(0xFFF57C00))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Mã giao dịch:", style = MaterialTheme.typography.labelLarge)
                    Text(pending.transactionId, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = pending.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF57C00)),
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Quay về Dashboard") }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // 1. Source Account Selection
                Text("Tài khoản nguồn", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                AccountSelector(accounts, sourceAccount) {
                    sourceAccount = it
                    if (it == destAccount) destAccount = null
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 2. Destination Branch Selection
                Text("Chi nhánh nhận", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("HN", "HCM", "DN").forEach { branch ->
                        FilterButton(
                            label = branch,
                            isSelected = destBranch == branch,
                            modifier = Modifier.weight(1f)
                        ) {
                            destBranch = branch
                            destAccount = null
                            viewModel.fetchDestinationAccounts(branch)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 3. Destination Account Selection
                Text("Tài khoản nhận", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (destBranch == null) {
                    Text("Vui lòng chọn chi nhánh nhận trước", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                } else if (isFetchingDest) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    val filteredDestAccounts = destAccounts.filter { it.id != sourceAccount?.id }
                    AccountSelector(filteredDestAccounts, destAccount) { destAccount = it }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 4. Amount Input
                Text("Số tiền chuyển (VND)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { if (it.all { char -> char.isDigit() }) amountText = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Nhập số tiền") },
                    singleLine = true
                )

                validationError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                }

                if (transferState is TransferUiState.Error) {
                    Text("Lỗi: ${(transferState as TransferUiState.Error).message}", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Spacer(modifier = Modifier.height(32.dp))

                // 5. Transfer Button
                Button(
                    onClick = {
                        val amount = amountText.toLongOrNull() ?: 0L
                        validationError = when {
                            sourceAccount == null -> "Vui lòng chọn tài khoản nguồn"
                            destAccount == null -> "Vui lòng chọn tài khoản nhận"
                            amount <= 0 -> "Số tiền phải lớn hơn 0"
                            amount > (sourceAccount?.balance ?: 0L) -> "Số dư không đủ"
                            else -> null
                        }
                        if (validationError == null) {
                            showConfirmDialog = true
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = transferState !is TransferUiState.Loading
                ) {
                    if (transferState is TransferUiState.Loading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Tiếp tục")
                    }
                }
            }
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Xác nhận chuyển tiền") },
            text = {
                Column {
                    Text("Từ: ${sourceAccount?.id} (${sourceAccount?.ownerName})")
                    Text("Đến: ${destAccount?.id} (${destAccount?.ownerName})")
                    Text("Số tiền: ${formatCurrency(amountText.toLongOrNull() ?: 0L, "VND")}")
                }
            },
            confirmButton = {
                Button(onClick = {
                    showConfirmDialog = false
                    viewModel.performTransfer(
                        sourceAccountId = sourceAccount!!.id,
                        destinationAccountId = destAccount!!.id,
                        amount = amountText.toLong(),
                        currency = "VND",
                        idempotencyKey = UUID.randomUUID().toString()
                    )
                }) { Text("Xác nhận") }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) { Text("Hủy") }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSelector(accounts: List<Account>, selectedAccount: Account?, onSelected: (Account) -> Unit) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selectedAccount?.let { "${it.id} - ${it.ownerName}" } ?: "Chọn tài khoản",
            onValueChange = {},
            readOnly = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable)
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            accounts.forEach { account ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text("${account.id} - ${account.ownerName}")
                            Text("Số dư: ${formatCurrency(account.balance, account.currency)}", style = MaterialTheme.typography.bodySmall)
                        }
                    },
                    onClick = {
                        onSelected(account)
                        expanded = false
                    }
                )
            }
        }
    }
}
@Composable
fun HistoryScreen(viewModel: BankingViewModel, modifier: Modifier = Modifier) {
    val historyState by viewModel.historyUiState.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Lịch sử giao dịch", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            TextButton(onClick = { viewModel.fetchTransactions() }) {
                Text("Làm mới", fontSize = 12.sp)
            }
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when (val state = historyState) {
                is HistoryUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is HistoryUiState.Success -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(state.transactions) { transaction ->
                            TransactionItem(transaction)
                        }
                    }
                }
                is HistoryUiState.Empty -> Text("Chưa có giao dịch nào", modifier = Modifier.align(Alignment.Center))
                is HistoryUiState.Error -> Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Lỗi: ${state.message}", color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                    Button(onClick = { viewModel.fetchTransactions() }, modifier = Modifier.padding(top = 8.dp)) {
                        Text("Thử lại")
                    }
                }
            }
        }
    }
}

@Composable
fun TransactionItem(tx: Transaction) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = tx.transactionId.take(12) + "...",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.outline
                )
                StatusChip(tx.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Từ: ${tx.sourceAccountId}", style = MaterialTheme.typography.bodyMedium)
                    Text("Đến: ${tx.destinationAccountId}", style = MaterialTheme.typography.bodyMedium)
                }
                Text(
                    text = formatCurrency(tx.amount, tx.currency),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (tx.status == "COMMITTED" || tx.status == "COMPLETED") Color(0xFF388E3C) else Color.Gray
                )
            }
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = formatDate(tx.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (tx.type != null) {
                    Text(
                        text = tx.type,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            if (tx.type == "DISTRIBUTED" && tx.participants != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Cá bên tham gia:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    tx.participants.forEach { p ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = MaterialTheme.shapes.extraSmall
                        ) {
                            Text(
                                text = "${p.branchId}: ${p.status}",
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val (color, bgColor) = when (status) {
        "COMMITTED", "COMPLETED" -> Color(0xFF2E7D32) to Color(0xFFE8F5E9)
        "ABORTED", "FAILED" -> Color(0xFFC62828) to Color(0xFFFFEBEE)
        "PREPARED", "PREPARING", "COMMITTING", "ABORTING" -> Color(0xFFF57C00) to Color(0xFFFFF3E0)
        else -> Color.Gray to Color(0xFFF5F5F5)
    }
    
    Surface(
        color = bgColor,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = status,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

fun formatDate(isoString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(isoString)
        val outputFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        isoString
    }
}

@Composable
fun DashboardScreen(viewModel: BankingViewModel, modifier: Modifier = Modifier) {
    val status by viewModel.connectionStatus.collectAsState()
    val accountState by viewModel.accountUiState.collectAsState()
    val selectedBranch by viewModel.selectedBranch.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Connection Status & Refresh
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Server: ", style = MaterialTheme.typography.bodySmall)
                StatusText(status)
            }
            TextButton(onClick = { viewModel.refresh() }) {
                Text("Làm mới", fontSize = 12.sp)
            }
        }

        // Summary Card
        if (accountState is AccountUiState.Success) {
            val accounts = (accountState as AccountUiState.Success).accounts
            SummaryCard(accounts)
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Branch Filters
        BranchFilterRow(selectedBranch) { branchId ->
            viewModel.fetchAccounts(branchId)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Account List or State
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when (val state = accountState) {
                is AccountUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is AccountUiState.Success -> AccountList(state.accounts)
                is AccountUiState.Empty -> Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Không có tài khoản", style = MaterialTheme.typography.bodyLarge)
                    Button(onClick = { viewModel.refresh() }, modifier = Modifier.padding(top = 8.dp)) {
                        Text("Thử lại")
                    }
                }
                is AccountUiState.Error -> Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Lỗi: ${state.message}",
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center
                    )
                    Button(onClick = { viewModel.refresh() }, modifier = Modifier.padding(top = 8.dp)) {
                        Text("Thử lại")
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryCard(accounts: List<Account>) {
    val totalBalance = accounts.sumOf { it.balance }
    val count = accounts.size

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = "Tổng số dư",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = formatCurrency(totalBalance, "VND"),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 12.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f)
            )
            Text(
                text = "$count tài khoản",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

@Composable
fun BranchFilterRow(selectedBranch: String?, onBranchSelected: (String?) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterButton("TẤT CẢ", selectedBranch == null, Modifier.weight(1f)) { onBranchSelected(null) }
        FilterButton("HN", selectedBranch == "HN", Modifier.weight(1f)) { onBranchSelected("HN") }
        FilterButton("HCM", selectedBranch == "HCM", Modifier.weight(1f)) { onBranchSelected("HCM") }
        FilterButton("DN", selectedBranch == "DN", Modifier.weight(1f)) { onBranchSelected("DN") }
    }
}

@Composable
fun FilterButton(label: String, isSelected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondaryContainer,
            contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer
        ),
        contentPadding = PaddingValues(horizontal = 4.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun AccountList(accounts: List<Account>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 16.dp)
    ) {
        items(accounts) { account ->
            AccountItem(account)
        }
    }
}

@Composable
fun AccountItem(account: Account) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = account.id,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Surface(
                    color = if (account.status == "ACTIVE") Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = account.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (account.status == "ACTIVE") Color(0xFF2E7D32) else Color(0xFFC62828)
                    )
                }
            }
            Text(
                text = account.ownerName,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 4.dp)
            )
            Row(
                modifier = Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Chi nhánh: ${account.branchId}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatCurrency(account.balance, account.currency),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF388E3C),
                modifier = Modifier.padding(top = 4.dp)
            )
            if (account.reservedBalance > 0) {
                Text(
                    text = "Đang tạm giữ: ${formatCurrency(account.reservedBalance, account.currency)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Red,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}

@Composable
fun StatusText(status: ConnectionStatus) {
    val (text, color) = when (status) {
        ConnectionStatus.CONNECTING -> "Connecting..." to Color.Gray
        ConnectionStatus.CONNECTED -> "Connected" to Color(0xFF4CAF50)
        ConnectionStatus.DISCONNECTED -> "Disconnected" to Color.Red
    }
    Text(text = text, color = color, fontWeight = FontWeight.Bold)
}

fun formatCurrency(amount: Long, currency: String): String {
    val format = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"))
    return format.format(amount).replace("₫", " $currency")
}
