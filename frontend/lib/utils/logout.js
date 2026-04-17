import { queryKeys } from '@/lib/query/queryKeys';

const protectedQueryKeys = [
  queryKeys.me,
  queryKeys.webauthn,
  queryKeys.welcomeSpinStatus,
  queryKeys.sellerMe,
  queryKeys.sellerAccess,
  queryKeys.wallet,
  queryKeys.walletTransactions,
  queryKeys.walletDepositConfig,
  queryKeys.walletDeposits,
  queryKeys.walletWithdrawals,
  queryKeys.walletP2p,
  queryKeys.walletStaking,
  queryKeys.products,
  queryKeys.auctions,
  queryKeys.orders,
  queryKeys.notificationsRoot,
  queryKeys.supportThreads,
  queryKeys.homepageBanners,
  queryKeys.homeProducts,
  queryKeys.teamChildren,
  queryKeys.teamSummary,
  queryKeys.teamTreeRoot,
  queryKeys.admin,
  queryKeys.weeklyCompensationRoot,
  queryKeys.monthlyCompensationRoot
];

export async function clearProtectedQueries(queryClient) {
  await Promise.allSettled(
    protectedQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey }))
  );

  protectedQueryKeys.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey });
  });
}
