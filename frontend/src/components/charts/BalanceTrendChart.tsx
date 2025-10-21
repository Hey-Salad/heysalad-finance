import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface BalanceTrendChartProps {
  data: DataPoint[];
}

const BalanceTrendChart = ({ data }: BalanceTrendChartProps) => (
  <div className="h-56 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#22c55e"
          fillOpacity={1}
          fill="url(#balanceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default BalanceTrendChart;
