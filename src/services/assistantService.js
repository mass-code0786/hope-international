const adminRepository = require('../repositories/adminRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getUTCDay();
  const diff = (day + 6) % 7;
  value.setUTCDate(value.getUTCDate() - diff);
  value.setUTCHours(0, 0, 0, 0);
  return value.toISOString().slice(0, 10);
}

function endOfWeek(date = new Date()) {
  const value = new Date(startOfWeek(date));
  value.setUTCDate(value.getUTCDate() + 6);
  return value.toISOString().slice(0, 10);
}

function startOfMonth(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return value.toISOString().slice(0, 10);
}

function endOfMonth(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return value.toISOString().slice(0, 10);
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function money(value) {
  return `$${toMoney(value).toFixed(2)}`;
}

function number(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function displayName(profile) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return fullName || profile?.username || 'Member';
}

function weakerLeg(teamSummary) {
  const left = Number(teamSummary?.left_count || 0);
  const right = Number(teamSummary?.right_count || 0);
  if (left === right) return 'balanced';
  return left < right ? 'left' : 'right';
}

function detectIntent(message = '') {
  const text = String(message || '').trim().toLowerCase();

  if (!text) return { type: 'overview', strategyAmount: null };

  const amountMatch = text.match(/\$?\s*(1000|500|100)\s*(\/\s*month|per month|monthly)?/i);
  if (amountMatch || /(plan|strategy|earn|income goal|monthly target)/i.test(text)) {
    const strategyAmount = amountMatch ? Number(amountMatch[1]) : null;
    return { type: 'earning_strategy', strategyAmount };
  }

  if (/(withdraw|withdrawal|cash out|payout)/i.test(text)) {
    return { type: 'withdrawal', strategyAmount: null };
  }

  if (/(team|binary|left leg|right leg|network|referral|grow my team|team growth)/i.test(text)) {
    return { type: 'team_growth', strategyAmount: null };
  }

  if (/(level income|level earning|downline income)/i.test(text)) {
    return { type: 'level_income', strategyAmount: null };
  }

  if (/(income|earning|direct income|matching income|reward income)/i.test(text)) {
    return { type: 'income_query', strategyAmount: null };
  }

  if (/(wallet|balance|funds|deposit wallet|income wallet|btct)/i.test(text)) {
    return { type: 'wallet_query', strategyAmount: null };
  }

  return { type: 'overview', strategyAmount: null };
}

function buildIncomeStats(transactions = []) {
  const credits = transactions.filter((item) => item?.tx_type === 'credit');
  const bySource = (source) => credits.filter((item) => item?.source === source).reduce((sum, item) => sum + Number(item?.amount || 0), 0);

  return {
    direct: toMoney(bySource('direct_income')),
    matching: toMoney(bySource('matching_income')),
    reward: toMoney(bySource('reward_qualification')),
    directDeposit: toMoney(bySource('direct_deposit_income')),
    levelDeposit: toMoney(bySource('level_deposit_income')),
    staking: toMoney(bySource('btct_staking_payout')),
    totalCredits: toMoney(credits.reduce((sum, item) => sum + Number(item?.amount || 0), 0))
  };
}

async function loadContext(userId) {
  const [profile, walletSummary, teamSummary, weeklySummary, monthlySummary, incomeTransactions, withdrawals] = await Promise.all([
    adminRepository.getUserProfile(null, userId),
    walletService.getWalletSummary(null, userId),
    adminRepository.getTeamSummary(null, userId),
    adminRepository.getUserLatestWeeklySummary(null, userId),
    adminRepository.getUserLatestMonthlySummary(null, userId),
    walletRepository.listIncomeTransactions(null, userId, 150),
    walletRepository.listWithdrawalRequests(null, userId, 10)
  ]);

  const wallet = walletSummary?.wallet || {};
  const incomeStats = buildIncomeStats(incomeTransactions);
  const latestWithdrawal = Array.isArray(withdrawals) ? withdrawals[0] || null : null;
  const leftCarry = weeklySummary ? Number(weeklySummary.left_pv || 0) : Number(profile?.carry_left_pv || 0);
  const rightCarry = weeklySummary ? Number(weeklySummary.right_pv || 0) : Number(profile?.carry_right_pv || 0);

  return {
    profile,
    userName: displayName(profile),
    wallet,
    teamSummary: teamSummary || {},
    weeklySummary,
    monthlySummary,
    incomeTransactions,
    incomeStats,
    withdrawals,
    latestWithdrawal,
    binary: {
      leftPv: leftCarry,
      rightPv: rightCarry,
      matchedPv: Number(weeklySummary?.matched_pv || 0),
      directIncome: Number(weeklySummary?.direct_income || 0),
      matchingIncomeNet: Number(weeklySummary?.matching_income_net || 0),
      currentWeekStart: weeklySummary?.cycle_start || startOfWeek(),
      currentWeekEnd: weeklySummary?.cycle_end || endOfWeek()
    },
    currentMonth: {
      start: monthlySummary?.month_start || startOfMonth(),
      end: monthlySummary?.month_end || endOfMonth()
    }
  };
}

function buildWalletReply(ctx) {
  const wallet = ctx.wallet || {};
  return {
    reply: `${ctx.userName}, your current total wallet balance is ${money(wallet.balance)}. That includes ${money(wallet.income_wallet_balance ?? wallet.income_balance)} in income, ${money(wallet.deposit_wallet_balance ?? wallet.deposit_balance)} in deposit funds, ${money(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance)} in withdrawal funds, and ${number(wallet.btct_available_wallet_balance ?? wallet.btct_available_balance ?? wallet.btct_balance)} BTCT available.`,
    suggestions: ['Show my income summary', 'Can I withdraw now?', 'Show my binary status']
  };
}

function buildIncomeReply(ctx) {
  const monthlyBv = Number(ctx.monthlySummary?.monthly_bv || 0);
  const rewardAmount = Number(ctx.monthlySummary?.reward_amount || 0);
  return {
    reply: `${ctx.userName}, your tracked income credits currently include ${money(ctx.incomeStats.direct)} direct income, ${money(ctx.incomeStats.matching)} matching income, ${money(ctx.incomeStats.reward)} reward income, ${money(ctx.incomeStats.directDeposit)} direct deposit income, and ${money(ctx.incomeStats.levelDeposit)} level income. Your latest monthly BV is ${number(monthlyBv)}, and your current reward projection is ${rewardAmount > 0 ? money(rewardAmount) : '$0.00'}.`,
    suggestions: ['Show my level income', 'Give me a $500/month plan', 'How is my team growing?']
  };
}

function buildLevelIncomeReply(ctx) {
  return {
    reply: `${ctx.userName}, your deposit-network earnings are split into ${money(ctx.incomeStats.directDeposit)} as direct deposit income and ${money(ctx.incomeStats.levelDeposit)} as level income from deeper team activity. To grow this faster, focus on helping your direct members activate and duplicate on both legs, because stronger direct depth usually improves downstream level credits.`,
    suggestions: ['How is my team growing?', 'Give me a $1000/month plan', 'Show my income summary']
  };
}

function buildTeamReply(ctx) {
  const summary = ctx.teamSummary || {};
  const weaker = weakerLeg(summary);
  const balanceSentence = weaker === 'balanced'
    ? 'Your left and right legs are currently balanced.'
    : `Your ${weaker} leg is the weaker side right now, so that side needs more active placement support.`;

  return {
    reply: `${ctx.userName}, your team currently has ${number(summary.total_descendants)} total members, with ${number(summary.left_count)} on the left leg, ${number(summary.right_count)} on the right leg, and ${number(summary.active_count)} active members. ${balanceSentence} For better binary growth, keep new activity flowing into the weaker side until both legs move more evenly.`,
    suggestions: ['Show my binary status', 'Give me a $500/month plan', 'How much income did I earn?']
  };
}

function buildBinaryReply(ctx) {
  const binary = ctx.binary;
  const strongerSide = binary.leftPv === binary.rightPv ? 'balanced' : binary.leftPv > binary.rightPv ? 'left' : 'right';
  const balanceLine = strongerSide === 'balanced'
    ? 'Your binary PV is balanced between both legs.'
    : `Your ${strongerSide} side is ahead in PV, so matching growth on the opposite side is the main gap.`;

  return {
    reply: `${ctx.userName}, for the current binary view from ${binary.currentWeekStart} to ${binary.currentWeekEnd}, you have ${number(binary.leftPv)} PV on the left side, ${number(binary.rightPv)} PV on the right side, and ${number(binary.matchedPv)} matched PV. Your latest net matching income is ${money(binary.matchingIncomeNet)}. ${balanceLine}`,
    suggestions: ['How is my team growing?', 'Give me a $100/month plan', 'Show my wallet']
  };
}

function buildWithdrawalReply(ctx) {
  const wallet = ctx.wallet || {};
  const latest = ctx.latestWithdrawal;
  const latestSentence = latest
    ? `Your latest withdrawal request was ${latest.status} for ${money(latest.amount)} on ${new Date(latest.created_at).toISOString().slice(0, 10)}.`
    : 'You do not have any recent withdrawal requests.';

  return {
    reply: `${ctx.userName}, you currently have ${money(wallet.balance)} available across your main wallet and ${money(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance)} sitting in the withdrawal wallet. ${latestSentence} If you want faster payout readiness, keep your wallet address updated and avoid draining the weaker binary leg if your goal is continued matching income.`,
    suggestions: ['Show my wallet', 'How much income did I earn?', 'Give me a $100/month plan']
  };
}

function buildStrategyReply(ctx, amount = 100) {
  const summary = ctx.teamSummary || {};
  const weaker = weakerLeg(summary);
  const active = Number(summary.active_count || 0);
  const total = Number(summary.total_descendants || 0);
  const plan = amount >= 1000 ? 1000 : amount >= 500 ? 500 : 100;

  const strategyMap = {
    100: `For a realistic $100/month path, focus on maintaining 2 to 4 active direct members, at least one active builder on each leg, and steady qualifying product movement every month. With your current active team count at ${active}, the biggest lever is helping one more member duplicate on the ${weaker === 'balanced' ? 'weaker' : weaker} side.`,
    500: `For a $500/month path, you need more consistent binary matching, not just one-time direct income. A solid target is 4 to 8 active direct builders, stronger left-right balance, and recurring team orders that create weekly PV on both sides. With ${total} total team members today, your next jump should come from activating depth instead of only adding width.`,
    1000: `For a $1000/month path, the structure has to duplicate beyond your first line. Aim for 8+ active builders, balanced momentum on both legs, and recurring team volume that keeps weekly matching alive. Right now, your coaching priority should be building leaders on the ${weaker === 'balanced' ? 'two' : weaker} side while preserving production on the stronger side.`
  };

  return {
    reply: `${ctx.userName}, here is your ${money(plan)}/month strategy plan. ${strategyMap[plan]} Your current snapshot is ${active} active members, ${number(summary.left_count || 0)} left-leg members, and ${number(summary.right_count || 0)} right-leg members, so the plan should be built around your actual binary balance instead of generic recruiting advice.`,
    suggestions: ['Show my binary status', 'How is my team growing?', 'Show my level income']
  };
}

function buildOverviewReply(ctx) {
  return {
    reply: `${ctx.userName}, I can answer your wallet, income, team growth, level income, binary status, withdrawal readiness, or build a ${money(100)}/month, ${money(500)}/month, or ${money(1000)}/month strategy plan using your Hope International account data. Right now you have ${money(ctx.wallet?.balance)} in wallet balance and ${number(ctx.teamSummary?.total_descendants || 0)} people in your team.`,
    suggestions: ['Show my wallet', 'How much income did I earn?', 'Give me a $500/month plan']
  };
}

async function chat(userId, message) {
  const ctx = await loadContext(userId);
  const intent = detectIntent(message);

  let result;
  switch (intent.type) {
    case 'wallet_query':
      result = buildWalletReply(ctx);
      break;
    case 'income_query':
      result = buildIncomeReply(ctx);
      break;
    case 'level_income':
      result = buildLevelIncomeReply(ctx);
      break;
    case 'team_growth':
      result = /binary/i.test(String(message || '')) ? buildBinaryReply(ctx) : buildTeamReply(ctx);
      break;
    case 'withdrawal':
      result = buildWithdrawalReply(ctx);
      break;
    case 'earning_strategy':
      result = buildStrategyReply(ctx, intent.strategyAmount || 100);
      break;
    default:
      result = buildOverviewReply(ctx);
      break;
  }

  return {
    intent: intent.type,
    reply: result.reply,
    suggestions: result.suggestions,
    summary: {
      walletBalance: toMoney(ctx.wallet?.balance),
      teamSize: Number(ctx.teamSummary?.total_descendants || 0),
      activeTeam: Number(ctx.teamSummary?.active_count || 0),
      directIncome: toMoney(ctx.incomeStats.direct),
      matchingIncome: toMoney(ctx.incomeStats.matching),
      levelIncome: toMoney(ctx.incomeStats.levelDeposit)
    }
  };
}

module.exports = {
  chat
};
