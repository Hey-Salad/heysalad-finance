import client from '../api/client';

export const fetchBurnRateMetrics = async () => {
  const response = await client.get('/burn-rate/current');
  return response.data;
};

export const calculateRunwayScenario = async (payload: {
  revenueMultiplier: number;
  expenseMultiplier: number;
}) => {
  const response = await client.get('/burn-rate/runway', {
    params: payload
  });
  return response.data;
};
