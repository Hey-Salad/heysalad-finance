import { projectRunwayWithScenario } from '../../services/burnRateService';

const baseline = {
  grossBurnRate: {
    sevenDay: 1000,
    thirtyDay: 900,
    ninetyDay: 800
  },
  netBurnRate: {
    sevenDay: 800,
    thirtyDay: 700,
    ninetyDay: 600
  },
  averageMonthlyIncome: 10000,
  averageMonthlyExpenses: 12000,
  averageNetBurn: 2000,
  currentCash: 60000,
  projectedRunwayMonths: 30
};

describe('burnRateService', () => {
  it('calculates extended runway when income increases', () => {
    const runway = projectRunwayWithScenario(baseline, {
      revenueMultiplier: 1.5,
      expenseMultiplier: 1
    });
    expect(runway).toBeGreaterThan(baseline.projectedRunwayMonths);
  });

  it('returns infinite runway when expenses drop below income', () => {
    const runway = projectRunwayWithScenario(baseline, {
      revenueMultiplier: 2,
      expenseMultiplier: 0.5
    });
    expect(runway).toBe(Infinity);
  });
});
