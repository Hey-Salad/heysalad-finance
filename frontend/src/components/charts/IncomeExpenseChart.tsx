import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DataPoint {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeExpenseChartProps {
  data: DataPoint[];
}

const IncomeExpenseChart = ({ data }: IncomeExpenseChartProps) => (
  <div className="h-56 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
        />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #cbd5f5', color: '#0f172a' }}
        />
        <Legend wrapperStyle={{ color: '#94a3b8' }} />
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default IncomeExpenseChart;
