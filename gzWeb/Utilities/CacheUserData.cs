﻿using System;
using System.Linq;
using gzDAL.Repos.Interfaces;
using NLog;
using Microsoft.ApplicationInsights;


namespace gzWeb.Utilities {

    /// <summary>
    /// 
    /// Query time intensive functions asynchronously that cache their results.
    /// 
    /// </summary>
    public class CacheUserData : ICacheUserData {

        private readonly IInvBalanceRepo invBalanceRepo;
        private readonly IUserPortfolioRepo custPortfolioRepo;
        private readonly TelemetryClient telemetry;
        private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

        public CacheUserData(IInvBalanceRepo invBalanceRepo, IUserPortfolioRepo custPortfolioRepo) {

            telemetry = new TelemetryClient();
            this.invBalanceRepo = invBalanceRepo;
            this.custPortfolioRepo = custPortfolioRepo;
        }

        /// <summary>
        /// 
        /// Cash user data by calling queries with async cache options
        /// 
        /// </summary>
        /// <param name="userId"></param>
        public void Query(int userId)
        {
            try
            {

                var summaryRes = invBalanceRepo.GetSummaryData(userId);

                invBalanceRepo.GetCustomerVintagesSellingValueNow(userId, summaryRes.Item1.Vintages.ToList());

                var _ = custPortfolioRepo.GetUserPlans(userId);

            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Exception in Query()");
                telemetry.TrackException(ex);
            }
        }
    }
}