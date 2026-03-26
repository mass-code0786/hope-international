const adminRepository = require('../../repositories/adminRepository');

async function getDashboardOverview() {
  const [summary, recentOrders, recentTransactions, weeklySalesTrend, incomeDistribution, rewardTrend, orderTrend] = await Promise.all([
    adminRepository.getDashboardSummary(null),
    adminRepository.getRecentOrders(null, 10),
    adminRepository.getRecentTransactions(null, 10),
    adminRepository.getWeeklySalesTrend(null, 8),
    adminRepository.getIncomeDistribution(null),
    adminRepository.getRewardQualificationTrend(null, 6),
    adminRepository.getOrderTrend(null, 8)
  ]);

  return {
    summary,
    recentOrders,
    recentTransactions,
    charts: {
      weeklySalesTrend,
      incomeDistribution,
      rewardQualificationTrend: rewardTrend,
      orderTrend
    }
  };
}

module.exports = {
  getDashboardOverview
};
