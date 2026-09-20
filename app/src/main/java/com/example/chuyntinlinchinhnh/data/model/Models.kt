package com.example.chuyntinlinchinhnh.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
    val message: String? = null
)

@Serializable
data class ApiError(
    val code: String? = null,
    val message: String
)

@Serializable
data class Branch(
    val id: String,
    val name: String,
    val location: String
)

@Serializable
data class Account(
    val id: String,
    val ownerName: String,
    val branchId: String,
    val balance: Long,
    val reservedBalance: Long = 0,
    val currency: String,
    val status: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class HealthResponse(
    val status: String,
    val service: String
)

@Serializable
data class TransferRequest(
    val sourceAccountId: String,
    val destinationAccountId: String,
    val amount: Long,
    val currency: String
)

@Serializable
data class TransferResponse(
    val transactionId: String,
    val status: String,
    val sourceAccountId: String? = null,
    val destinationAccountId: String? = null,
    val amount: Long? = null,
    val currency: String? = null,
    val message: String? = null
)

@Serializable
data class Transaction(
    val transactionId: String,
    val idempotencyKey: String,
    val sourceAccountId: String,
    val destinationAccountId: String,
    val amount: Long,
    val currency: String,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    val type: String? = null,
    val decision: String? = null,
    val participants: List<Participant>? = null
)

@Serializable
data class Participant(
    val branchId: String,
    val role: String,
    val status: String
)
