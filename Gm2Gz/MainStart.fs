﻿open NLog
open System
open System.IO
open FSharp.Configuration
open GzBalances
open GzDb
open DbImport
open ExcelSchemas
open ArgumentsProcessor

type Settings = AppSettings< "app.config" >
let logger = LogManager.GetCurrentClassLogger()

#if DEBUG && !PRODUCTION

let isProd = false
let dbConnectionString = Settings.ConnectionStrings.GzDevDb

logger.Warn(sprintf "Development db: %s" dbConnectionString)

#endif
#if PRODUCTION

let isProd = true
let dbConnectionString = Settings.ConnectionStrings.GzProdDb
logger.Warn(sprintf "PRODUCTION db: %s" dbConnectionString)
#endif

let drive = Path.GetPathRoot  __SOURCE_DIRECTORY__
let inRptFolder = Path.Combine([| drive ; Settings.BaseFolder; Settings.ExcelInFolder |])
let outRptFolder = Path.Combine([| drive ; Settings.BaseFolder; Settings.ExcelOutFolder |])
let currencyRatesUrl = Settings.CurrencyRatesUrl.ToString()

let processGm2Gz 
        (db : DbContext)
        (balanceFilesUsage : BalanceFilesUsageType)
        (marketPortfolioShares : PortfolioTypes.PortfoliosPricesMap) =
    try
        logger.Info("Start processing @ UTC : " + DateTime.UtcNow.ToString("s"))
        logger.Info("----------------------------")

        logger.Info("Validating Gm excel rpt files")
        
        let rptFilesOkToProcess = { GmRptFiles.isProd = isProd; GmRptFiles.folderName = inRptFolder }
                                    |> GmRptFiles.getExcelFilenames
                                    |> GmRptFiles.balanceRptDateMatchTitles
                                    |> GmRptFiles.vendor2UserRptContentMatch
                                    |> GmRptFiles.getExcelDtStr
                                    |> GmRptFiles.getExcelDates 
                                    |> GmRptFiles.areExcelFilenamesValid
        if not rptFilesOkToProcess.Valid then
            exit 1

        // Extract & Load Daily Everymatrix Report
        Etl.ProcessExcelFolder isProd db inRptFolder outRptFolder

        (db, rptFilesOkToProcess.DayToProcess, marketPortfolioShares) |||> UserTrx.processGzTrx

        logger.Info("----------------------------")
        logger.Info("Finished processing @ UTC : " + DateTime.UtcNow.ToString("s"))

    with ex ->
        logger.Fatal(ex, "Runtime Exception at main")

/// Choose next biz processing steps based on args
let processArgs (db : DbContext)(balanceFilesUsageArg : BalanceFilesUsageType) =
    DailyPortfolioShares.storeShares db
    |> processGm2Gz db balanceFilesUsageArg

/// Canopy related and excel downloading 
let downloadArgs : ExcelSchemas.EverymatriReportsArgsType =
    let everymatrixPortalArgs  : ExcelSchemas.EverymatrixPortalArgsType = {
        EmailReportsUser = Settings.ReportsEmailUser;
        EmailReportsPwd = Settings.ReportsEmailPwd;
        EverymatrixPortalUri = Settings.EverymatrixProdPortalUri;
        EverymatrixUsername = Settings.EverymatrixProdUsername;
        EverymatrixPassword = Settings.EverymatrixProdPassword;
        EverymatrixToken = Settings.EverymatrixProdToken;
    }

    let reportsFolders : ExcelSchemas.ReportsFoldersType = {
        BaseFolder = Settings.BaseFolder;
        ExcelInFolder = Settings.ExcelInFolder;
        ExcelOutFolder = Settings.ExcelOutFolder;
        reportsDownloadFolder = Settings.ReportsDownloadFolder;
    }

    let reportsFilesArgs : ExcelSchemas.ReportsFilesArgsType = {
            DownloadedCustomFilter = Settings.DownloadedCustomFilter;
            DownloadedBalanceFilter = Settings.DownloadedBalanceFilter;
            DownloadedWithdrawalsFilter = Settings.DownloadedWithdrawalsFilter;
            DownloadedVendor2UserFilter = Settings.DownloadedVendor2UserFilter;
            CustomRptFilenamePrefix = Settings.CustomRptFilenamePrefix;
            EndBalanceRptFilenamePrefix = Settings.EndBalanceRptFilenamePrefix;
            WithdrawalsPendingRptFilenamePrefix = Settings.WithdrawalsPendingRptFilenamePrefix;
            WithdrawalsRollbackRptFilenamePrefix = Settings.WithdrawalsRollbackRptFilenamePrefix;
            Vendor2UserRptFilenamePrefix = Settings.Vendor2UserRptFilenamePrefix;
            Wait_For_File_Download_MS = Settings.WaitForFileDownloadMs;
        }

    let everymatrixReportsArgs : ExcelSchemas.EverymatriReportsArgsType = {
        EverymatrixPortalArgs = everymatrixPortalArgs;
        ReportsFoldersArgs = reportsFolders;
        ReportsFilesArgs = reportsFilesArgs;
    }
    everymatrixReportsArgs
    

[<EntryPoint>]
let main argv = 

    // Create a database context
    let db = getOpenDb dbConnectionString

    let balanceFilesUsageArg = 
        argv |> parseCmdArgs

    let dwLoader = ExcelDownloader(downloadArgs, balanceFilesUsageArg)
    dwLoader.SaveReportsToInputFolder()

    // Main database processing 
    processArgs db balanceFilesUsageArg

    printfn "Press Enter to finish..."
    Console.ReadLine() |> ignore
    0
(*****
* Notes
* http://stackoverflow.com/questions/22608584/how-to-project-transform-an-array-of-fileinfo-to-a-list-of-strings-with-fsharp/22608949#22608949
* http://stackoverflow.com/questions/14657954/using-nlog-with-f-interactive-in-visual-studio-need-documentation
* https://msdn.microsoft.com/en-us/microsoft-r/hh225374 walkthrough of sql data provider
* http://stackoverflow.com/questions/13768757/how-is-one-supposed-to-use-the-f-sqldataconnection-typeprovider-with-an-app-con
* http://stackoverflow.com/questions/13107676/f-type-provider-for-sql-in-a-class
* http://stackoverflow.com/questions/32312503/f-typeproviders-how-to-change-database?noredirect=1&lq=1
*)

