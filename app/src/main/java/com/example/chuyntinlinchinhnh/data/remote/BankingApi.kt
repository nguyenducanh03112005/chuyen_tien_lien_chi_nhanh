package com.example.chuyntinlinchinhnh.data.remote

import com.example.chuyntinlinchinhnh.data.model.*
import retrofit2.http.*

interface BankingApi {
    @GET("api/health")
    suspend fun checkHealth(): HealthResponse

    @GET("api/branches")
    suspend fun getBranches(): List<Branch>

    // Account APIs
    @GET("api/accounts")
    suspend fun getAccounts(@Query("branchId") branchId: String? = null): ApiResponse<List<Account>>

    @GET("api/accounts/{id}")
    suspend fun getAccountById(@Path("id") id: String): ApiResponse<Account>

    @POST("api/accounts")
    suspend fun createAccount(@Body account: Account): ApiResponse<Account>

    @PUT("api/accounts/{id}")
    suspend fun updateAccount(@Path("id") id: String, @Body account: Account): ApiResponse<Account>

    @DELETE("api/accounts/{id}")
    suspend fun deleteAccount(@Path("id") id: String): ApiResponse<Unit>

    // Transfer APIs
    @GET("api/transfers")
    suspend fun getTransfers(): ApiResponse<List<Transaction>>

    @GET("api/transfers/{id}")
    suspend fun getTransferById(@Path("id") id: String): ApiResponse<Transaction>

    @POST("api/transfers")
    suspend fun createTransfer(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body request: TransferRequest
    ): TransferResponse
}
