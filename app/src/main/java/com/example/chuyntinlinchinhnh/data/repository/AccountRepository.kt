package com.example.chuyntinlinchinhnh.data.repository

import com.example.chuyntinlinchinhnh.data.model.Account
import com.example.chuyntinlinchinhnh.data.model.ApiResponse
import com.example.chuyntinlinchinhnh.data.model.Transaction
import com.example.chuyntinlinchinhnh.data.remote.BankingApi

class AccountRepository(private val api: BankingApi) {

    suspend fun getAccounts(branchId: String? = null): ApiResponse<List<Account>> {
        return try {
            api.getAccounts(branchId)
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun getAccountById(id: String): ApiResponse<Account> {
        return try {
            api.getAccountById(id)
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun createAccount(account: Account): ApiResponse<Account> {
        return try {
            api.createAccount(account)
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun updateAccount(id: String, account: Account): ApiResponse<Account> {
        return try {
            api.updateAccount(id, account)
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun deleteAccount(id: String): ApiResponse<Unit> {
        return try {
            api.deleteAccount(id)
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }

    suspend fun createTransfer(
        idempotencyKey: String,
        request: com.example.chuyntinlinchinhnh.data.model.TransferRequest
    ): com.example.chuyntinlinchinhnh.data.model.TransferResponse {
        return api.createTransfer(idempotencyKey, request)
    }

    suspend fun getTransfers(): ApiResponse<List<Transaction>> {
        return try {
            api.getTransfers()
        } catch (e: Exception) {
            ApiResponse(success = false, message = e.message ?: "Unknown error")
        }
    }
}
