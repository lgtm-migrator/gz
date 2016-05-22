﻿using gzDAL.Models;
using System;
using System.Collections.Generic;
using gzDAL.DTO;

namespace gzDAL.Repos.Interfaces
{
    public interface IGzTransactionRepo {

        decimal GetTotalDeposit(int customerId);

        IEnumerable<VintageDto> GetCustomerVintages(int customerId);

        IEnumerable<int> GetActiveCustomers(string startYearMonthStr, string endYearMonthStr);

        bool GetLiquidationTrxCount(int customerId, int yearCurrent, int monthCurrent);

        DateTime GetSoldPortfolioTimestamp(int customerId, int yearCurrent, int monthCurrent);

        decimal GetWithdrawnFees(decimal liquidationAmount);

        WithdrawEligibilityDTO GetWithdrawEligibilityData(int customerId);

        bool GetEnabledWithdraw(int customerId);

        void SaveDbGmTransaction(int customerId, GmTransactionTypeEnum gzTransactionType, decimal amount,
            DateTime createdOnUtc);

        void SaveDbGzTransaction(int customerId, GzTransactionTypeEnum gzTransactionType, decimal amount,
            DateTime createdOnUtc);

        void SaveDbInvWithdrawalAmount(int customerId, decimal withdrawnAmount, DateTime createdOnUtc);

        void SaveDbPlayingLoss(int customerId, decimal totPlayinLossAmount, decimal creditPcnt, DateTime createdOnUtc);

        void SaveDbTransferToGamingAmount(int customerId, decimal withdrawnAmount, DateTime createdOnUtc);

        decimal SaveDbLiquidatedPortfolioWithFees(int customerId, decimal liquidationAmount, GzTransactionTypeEnum sellingJournalTypeReason, DateTime createdOnUtc);
    }
}