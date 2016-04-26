﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Web;
using System.Web.Http;
using AutoMapper;
using gzDAL;
using gzDAL.Conf;
using gzDAL.DTO;
using gzDAL.Models;
using gzDAL.ModelUtil;
using gzDAL.Repos;
using gzDAL.Repos.Interfaces;
using gzWeb.Configuration;
using gzWeb.Contracts;
using gzWeb.Models;
using gzWeb.Utilities;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using NLog.LayoutRenderers;

namespace gzWeb.Controllers
{
    [Authorize]
    // TODO: [RoutePrefix("api/Investments")]
    public class InvestmentsApiController : BaseApiController, IInvestmentsApi
    {
        #region Constructor
        public InvestmentsApiController(
            ApplicationDbContext dbContext,
            IInvBalanceRepo invBalanceRepo,
            IGzTransactionRepo gzTransactionRepo,
            ICustFundShareRepo custFundShareRepo,
            ICurrencyRateRepo currencyRateRepo,
            IMapper mapper,
            ApplicationUserManager userManager):base(userManager)
        {
            _dbContext = dbContext;
            _invBalanceRepo = invBalanceRepo;
            _gzTransactionRepo = gzTransactionRepo;
            _custFundShareRepo = custFundShareRepo;
            _currencyRateRepo = currencyRateRepo;
            _mapper = mapper;
        }
        #endregion
        
        #region Actions

        #region Summary
        
        [HttpGet]
        public IHttpActionResult GetSummaryData() {

            var user = UserManager.FindById(User.Identity.GetUserId<int>());
            if (user == null)
                return OkMsg(new object(), "User not found!");
            
            return OkMsg(((IInvestmentsApi)this).GetSummaryData(user));
        }

        SummaryDataViewModel IInvestmentsApi.GetSummaryData(ApplicationUser user)
        {
            var userCurrency = CurrencyHelper.GetSymbol(user.Currency);
            var usdToUserRate = _currencyRateRepo.GetLastCurrencyRateFromUSD(userCurrency.ISOSymbol);

            //var vintages = _dummyVintages;
            var customerVintages = _gzTransactionRepo.GetCustomerVintages(user.Id);
            var vintages = customerVintages.Select(t => _mapper.Map<VintageDto, VintageViewModel>(t)).ToList();

            return new SummaryDataViewModel
            {
                Currency = userCurrency.Symbol,
                Culture = "en-GB",
                InvestmentsBalance = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.InvBalance),
                TotalDeposits = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.TotalDeposits),
                TotalWithdrawals = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.TotalWithdrawals),

                //TODO: from the EveryMatrix Web API
                GamingBalance = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate),

                TotalInvestments = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.TotalInvestments),

                // TODO (Mario): Check if it's more accurate to report this as [InvestmentsBalance - TotalInvestments]
                TotalInvestmentsReturns = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.TotalInvestmentReturns),

                NextInvestmentOn = DbExpressions.GetNextMonthsFirstWeekday(),
                LastInvestmentAmount = DbExpressions.RoundCustomerBalanceAmount(usdToUserRate * user.LastInvestmentAmount),
                StatusAsOf = _invBalanceRepo.GetLastUpdatedDateTime(user.Id),
                Vintages = vintages
            };
        }

        [HttpPost]
        public IHttpActionResult TransferCashToGames()
        {
            return OkMsg(() =>
            {
                
            });
        }
        #endregion

        #region Portfolio
        [HttpGet]
        public IHttpActionResult GetPortfolioData()
        {
            var user = UserManager.FindById(User.Identity.GetUserId<int>());
            if (user == null) 
                return OkMsg(new object(), "User not found!");
            
            var now = DateTime.Now;
            var model = new PortfolioDataViewModel
                        {
                                Currency = CurrencyHelper.GetSymbol(user.Currency).Symbol,
                                NextInvestmentOn = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month)),
                                NextExpectedInvestment = 15000,
                                ROI = new ReturnOnInvestmentViewModel {Title = "% Current ROI", Percent = 59},
                                Plans = GetCustomerPlans(user)
                        };
            return OkMsg(model);
        }

        [HttpPost]
        public IHttpActionResult SetPlanSelection()
        {
            return OkMsg(() =>
            {

            });
        }
        #endregion

        #region Performance
        [HttpGet]
        public IHttpActionResult GetPerformanceData()
        {
            var user = UserManager.FindById(User.Identity.GetUserId<int>());
            if (user == null)
                return OkMsg(new object(), "User not found!");

            var model = new PerformanceDataViewModel
                        {
                                Currency = CurrencyHelper.GetSymbol(user.Currency).Symbol,
                                Plans = GetCustomerPlans(user)
                        };
            return OkMsg(model);
        }
        #endregion

        #region Activity
        #endregion
        
        [HttpGet]
        public IHttpActionResult GetPortfolios()
        {
            return OkMsg(() =>
            {
                var portfolios =
                    _dbContext.Portfolios
                              .Where(x => x.IsActive)
                              .Select(x => new
                                      {
                                          x.Id,
                                          x.RiskTolerance,
                                          Funds = x.PortFunds.Select(f => new {f.Fund.HoldingName, f.Weight})
                                      })
                              .ToList();
                return portfolios;
            });
        }
        #endregion

        private IEnumerable<PlanViewModel> GetCustomerPlans(ApplicationUser user)
        {
            var customerPortfolio = _custFundShareRepo.GetCurrentCustomerPortfolio(user.Id);

            var portfolios = _dbContext.Portfolios
                             .Where(x => x.IsActive);

            foreach (var portfolio in portfolios)
            {
                yield return CreateFromPrototype(portfolio, customerPortfolio != null && portfolio.Id == customerPortfolio.Id);
            }
        }

        private PlanViewModel CreateFromPrototype(Portfolio x, bool active)
        {
            var portfolioPrototype = PortfolioConfiguration.GetPortfolioPrototype(x.RiskTolerance);
            return new PlanViewModel
                   {
                           Id = x.Id,
                           Title = portfolioPrototype.Title,
                           Balance = 0, // TODO: get from customer data
                           Color = portfolioPrototype.Color,
                           Percent = active ? 100 : 0,
                           ReturnRate = 0, // TODO: ???
                           Selected = active, // TODO: get from customer data
                           Holdings = x.PortFunds.Select(f => new HoldingViewModel
                                                              {
                                                                      Name = f.Fund.HoldingName,
                                                                      Weight = f.Weight
                                                              })
                   };
        }
        
        #region Fields

        private readonly IMapper _mapper;
        private readonly IInvBalanceRepo _invBalanceRepo;
        private readonly IGzTransactionRepo _gzTransactionRepo;
        private readonly ICurrencyRateRepo _currencyRateRepo;
        private readonly ICustFundShareRepo _custFundShareRepo;
        private readonly ApplicationDbContext _dbContext;

        #endregion

        #region Dummy Data
        
        private static IList<VintageViewModel> _dummyVintages = new[]
        {
            new VintageViewModel {Date = new DateTime(2014, 7, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2014, 8, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2014, 9, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2014, 10, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2014, 11, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2014, 12, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 1, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 2, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 3, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 4, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 5, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 6, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 7, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 8, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 9, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 10, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 11, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2015, 12, 1), InvestAmount = 100M, ReturnPercent = 10},
            new VintageViewModel {Date = new DateTime(2016, 1, 1), InvestAmount = 200M, ReturnPercent = -5},
            new VintageViewModel {Date = new DateTime(2016, 2, 1), InvestAmount = 80M, ReturnPercent = 15},
            new VintageViewModel {Date = new DateTime(2016, 3, 1), InvestAmount = 150M, ReturnPercent = 10},
        };

        #endregion
    }
}
