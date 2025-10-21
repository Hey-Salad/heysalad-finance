import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Loader from '../components/Loader';
import type { BalanceSheet, CashFlow, ProfitAndLoss } from '../api/statements';
import { exportStatement, fetchBalanceSheet, fetchCashFlow, fetchProfitAndLoss } from '../api/statements';

const statements = ['balance-sheet', 'p-and-l', 'cash-flow'] as const;
type StatementType = (typeof statements)[number];

const FinancialStatementsPage = () => {
  const [statement, setStatement] = useState<StatementType>('balance-sheet');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const range = useMemo(
    () => ({
      startDate,
      endDate
    }),
    [startDate, endDate]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['financial-statement', statement, range.startDate, range.endDate],
    queryFn: () => {
      switch (statement) {
        case 'balance-sheet':
          return fetchBalanceSheet(range);
        case 'p-and-l':
          return fetchProfitAndLoss(range);
        case 'cash-flow':
          return fetchCashFlow(range);
        default:
          return Promise.reject(new Error('Unsupported statement type'));
      }
    },
    keepPreviousData: true,
    staleTime: 60_000
  });

  const handleExport = async () => {
    try {
      const result = await exportStatement(statement, format, range);
      const filename = `${statement}-${startDate}-${endDate}.${format}`;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(result, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      const blob = new Blob([result as BlobPart], {
        type: format === 'csv' ? 'text/csv' : 'application/pdf'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(`Failed to export statement: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h2 className="text-lg font-semibold">Unable to load statements</h2>
        <p className="mt-2 text-sm">Please retry or adjust the selected date range.</p>
      </div>
    );
  }

  const balanceSheet = data as BalanceSheet;
  const profitAndLoss = data as ProfitAndLoss;
  const cashFlow = data as CashFlow;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Financial Statements</h2>
          <p className="text-sm text-slate-500">
            Generate balance sheet, P&amp;L, and cash flow exports with double-entry accuracy.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={statement}
            onChange={(event) => setStatement(event.target.value as StatementType)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="balance-sheet">Balance Sheet</option>
            <option value="p-and-l">Profit &amp; Loss</option>
            <option value="cash-flow">Cash Flow</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as 'json' | 'csv' | 'pdf')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
        {statement === 'balance-sheet' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Assets</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {balanceSheet.assets.map((item) => (
                  <li key={item.account} className="flex justify-between">
                    <span>{item.account}</span>
                    <span>{item.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Liabilities</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {balanceSheet.liabilities.map((item) => (
                  <li key={item.account} className="flex justify-between">
                    <span>{item.account}</span>
                    <span>{item.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Equity</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {balanceSheet.equity.map((item) => (
                  <li key={item.account} className="flex justify-between">
                    <span>{item.account}</span>
                    <span>{item.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p>Total Assets: {balanceSheet.totals.assets.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
                <p>Total Liabilities: {balanceSheet.totals.liabilities.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
                <p>Total Equity: {balanceSheet.totals.equity.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </div>
          </div>
        )}

        {statement === 'p-and-l' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Income</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {profitAndLoss.income.map((item) => (
                  <li key={item.account} className="flex justify-between">
                    <span>{item.account}</span>
                    <span>{item.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Expenses</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {profitAndLoss.expenses.map((item) => (
                  <li key={item.account} className="flex justify-between">
                    <span>{item.account}</span>
                    <span>{item.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {statement === 'cash-flow' && (
          <div className="space-y-3 text-sm text-slate-700">
            <p>Operating: {cashFlow.operating.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
            <p>Investing: {cashFlow.investing.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
            <p>Financing: {cashFlow.financing.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
            <p className="text-slate-500">Net change: {cashFlow.netChange.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default FinancialStatementsPage;
