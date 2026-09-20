package com.example.chuyntinlinchinhnh.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.chuyntinlinchinhnh.data.model.Account
import com.example.chuyntinlinchinhnh.data.model.Transaction
import com.example.chuyntinlinchinhnh.data.remote.RetrofitClient
import com.example.chuyntinlinchinhnh.data.repository.AccountRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

enum class ConnectionStatus {
    CONNECTING, CONNECTED, DISCONNECTED
}

sealed class AccountUiState {
    object Loading : AccountUiState()
    data class Success(val accounts: List<Account>) : AccountUiState()
    object Empty : AccountUiState()
    data class Error(val message: String) : AccountUiState()
}

sealed class TransferUiState {
    object Idle : TransferUiState()
    object Loading : TransferUiState()
    data class Success(val transactionId: String) : TransferUiState()
    data class Error(val message: String) : TransferUiState()
}

sealed class HistoryUiState {
    object Loading : HistoryUiState()
    data class Success(val transactions: List<Transaction>) : HistoryUiState()
    object Empty : HistoryUiState()
    data class Error(val message: String) : HistoryUiState()
}

sealed class AuthState {
    object LoggedOut : AuthState()
    object LoggedIn : AuthState()
}

class BankingViewModel : ViewModel() {

    private val repository = AccountRepository(RetrofitClient.instance)

    private val _connectionStatus = MutableStateFlow(ConnectionStatus.CONNECTING)
    val connectionStatus: StateFlow<ConnectionStatus> = _connectionStatus

    private val _authState = MutableStateFlow<AuthState>(AuthState.LoggedOut)
    val authState: StateFlow<AuthState> = _authState

    private val _loginErrorMessage = MutableStateFlow<String?>(null)
    val loginErrorMessage: StateFlow<String?> = _loginErrorMessage

    private val _accountUiState = MutableStateFlow<AccountUiState>(AccountUiState.Loading)
    val accountUiState: StateFlow<AccountUiState> = _accountUiState

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    private val _selectedBranch = MutableStateFlow<String?>(null)
    val selectedBranch: StateFlow<String?> = _selectedBranch

    private val _transferUiState = MutableStateFlow<TransferUiState>(TransferUiState.Idle)
    val transferUiState: StateFlow<TransferUiState> = _transferUiState

    private val _historyUiState = MutableStateFlow<HistoryUiState>(HistoryUiState.Loading)
    val historyUiState: StateFlow<HistoryUiState> = _historyUiState

    private val _destinationAccounts = MutableStateFlow<List<Account>>(emptyList())
    val destinationAccounts: StateFlow<List<Account>> = _destinationAccounts

    private val _isFetchingDestAccounts = MutableStateFlow(false)
    val isFetchingDestAccounts: StateFlow<Boolean> = _isFetchingDestAccounts

    private var started = false

    fun start() {
        if (started) {
            refresh()
            return
        }
        started = true
        checkApiHealth()
        fetchAccounts()
        fetchTransactions()
    }

    fun checkApiHealth() {
        viewModelScope.launch {
            _connectionStatus.value = ConnectionStatus.CONNECTING
            _errorMessage.value = null
            try {
                val response = RetrofitClient.instance.checkHealth()
                if (response.status == "UP") {
                    _connectionStatus.value = ConnectionStatus.CONNECTED
                } else {
                    _connectionStatus.value = ConnectionStatus.DISCONNECTED
                    _errorMessage.value = "Unexpected server status: ${response.status}"
                }
            } catch (e: Exception) {
                _connectionStatus.value = ConnectionStatus.DISCONNECTED
                _errorMessage.value = "Không thể kết nối Mock Server. Kiểm tra server đang chạy tại port 3000.\nLỗi: ${e.message}"
            }
        }
    }

    private suspend fun internalFetchAccounts(branchId: String?) {
        try {
            val response = repository.getAccounts(branchId)
            if (response.success) {
                val accounts = response.data ?: emptyList()
                _accountUiState.value = if (accounts.isEmpty()) AccountUiState.Empty else AccountUiState.Success(accounts)
            } else {
                _accountUiState.value = AccountUiState.Error(response.message ?: "Unknown error")
            }
        } catch (e: Exception) {
            _accountUiState.value = AccountUiState.Error(e.message ?: "Unknown error")
        }
    }

    fun fetchAccounts(branchId: String? = _selectedBranch.value, quiet: Boolean = false) {
        _selectedBranch.value = branchId
        viewModelScope.launch {
            if (!quiet) _accountUiState.value = AccountUiState.Loading
            internalFetchAccounts(branchId)
        }
    }

    private suspend fun internalFetchTransactions() {
        try {
            val response = repository.getTransfers()
            if (response.success) {
                val transactions = response.data ?: emptyList()
                _historyUiState.value = if (transactions.isEmpty()) HistoryUiState.Empty else HistoryUiState.Success(transactions)
            } else {
                _historyUiState.value = HistoryUiState.Error(response.message ?: "Unknown error")
            }
        } catch (e: Exception) {
            _historyUiState.value = HistoryUiState.Error(e.message ?: "Unknown error")
        }
    }

    fun fetchTransactions(quiet: Boolean = false) {
        viewModelScope.launch {
            if (!quiet) _historyUiState.value = HistoryUiState.Loading
            internalFetchTransactions()
        }
    }

    fun refresh() {
        checkApiHealth()
        fetchAccounts(_selectedBranch.value, quiet = true)
        fetchTransactions(quiet = true)
    }

    fun fetchDestinationAccounts(branchId: String) {
        viewModelScope.launch {
            _isFetchingDestAccounts.value = true
            try {
                val response = repository.getAccounts(branchId)
                if (response.success) {
                    _destinationAccounts.value = response.data ?: emptyList()
                } else {
                    _destinationAccounts.value = emptyList()
                }
            } catch (_: Exception) {
                _destinationAccounts.value = emptyList()
            }
            _isFetchingDestAccounts.value = false
        }
    }

    fun performTransfer(
        sourceAccountId: String,
        destinationAccountId: String,
        amount: Long,
        currency: String,
        idempotencyKey: String
    ) {
        viewModelScope.launch {
            _transferUiState.value = TransferUiState.Loading
            try {
                val response = repository.createTransfer(
                    idempotencyKey,
                    com.example.chuyntinlinchinhnh.data.model.TransferRequest(
                        sourceAccountId,
                        destinationAccountId,
                        amount,
                        currency
                    )
                )
                
                // Refresh accounts and history IMMEDIATELY and wait for them
                internalFetchAccounts(_selectedBranch.value)
                internalFetchTransactions()

                _transferUiState.value = TransferUiState.Success(response.transactionId)
            } catch (e: Exception) {
                _transferUiState.value = TransferUiState.Error(e.message ?: "Transfer failed")
            }
        }
    }

    fun resetTransferState() {
        _transferUiState.value = TransferUiState.Idle
        _destinationAccounts.value = emptyList()
    }

    fun login(username: String, password: String) {
        _loginErrorMessage.value = null
        if (username.isBlank()) {
            _loginErrorMessage.value = "Tên đăng nhập không được để trống"
            return
        }
        if (password.isBlank()) {
            _loginErrorMessage.value = "Mật khẩu không được để trống"
            return
        }

        if (username == "admin" && password == "admin123") {
            _authState.value = AuthState.LoggedIn
            _loginErrorMessage.value = null
        } else {
            _loginErrorMessage.value = "Sai tên đăng nhập hoặc mật khẩu"
        }
    }

    fun logout() {
        _authState.value = AuthState.LoggedOut
    }
}
