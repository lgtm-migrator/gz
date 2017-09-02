namespace DbImport

module ExcelSchemas =
    open FSharp.ExcelProvider

    // LGA Reports...Player Balances
    type BalanceExcelSchema = ExcelFile< "Balance Prod 20161001.xlsx" >
    type CustomExcelSchema = ExcelFile< "Custom Prod 20170611.xlsx" >
    // Transactions Rpt: Withdrawal Type + Initiated + Pending + Rollback
    type WithdrawalsPendingExcelSchema = ExcelFile< "WithdrawalsPending prod 20160930.xlsx" >
    // Transactions Rpt: Withdrawal Type + Completed + Rollback
    type WithdrawalsRollbackExcelSchema = WithdrawalsPendingExcelSchema
    type DepositsExcelSchema = ExcelFile< "Vendor2User Prod 20170606.xlsx" >
    type CurrencyExchanges = ExcelFile< "ExchangeRate-31-08-2017.xlsx" >

    type DepositOrWithdrawalTrxType =
        | DepositTrx
        | WithdrawalTrx

    type RptType =
    | CustomRptExcel
    | BalanceRptExcel
    | WithdrawalsRptExcel
    | Vendor2UserRptExcel
    | ExchRateRptExcel

    type BalanceType =
    | BeginingBalance
    | EndingBalance

    type WithdrawalType =
    | Pending
    | Rollback
    | Completed

    type DepositsAmountType =
    | V2UDeposit    // Vendor2User Deposit
    | V2UCashBonus  // Vendor2User Cash Bonus
    | Deposit       // Normal User Deposit

    let WithdrawalTypeString = function 
        | Pending -> "Pending"
        | Rollback -> "Rollback"
        | Completed -> "Completed"