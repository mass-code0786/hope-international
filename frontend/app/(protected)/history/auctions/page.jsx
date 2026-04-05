'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { Clock3, Gavel, History, Sparkles, Trophy } from 'lucide-react';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { AuctionCard } from '@/components/auctions/AuctionUi';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMyAuctionHistory } from '@/lib/services/auctionsService';
import { getBtctStakingSummary, getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { currency, dateTime, incomeSourceLabel, number } from '@/lib/utils/format';

const hubTabs = [
  { label: 'My Bids', value: 'bids', icon: Gavel },
  { label: 'My Winning', value: 'wins', icon: Trophy },
  { label: 'BTCT', value: 'btct', icon: BtctCoinLogo },
  { label: 'Staking', value: 'staking', icon: BtctCoinLogo },
  { label: 'Income', value: 'income', icon: Clock3 },
  { label: 'History', value: 'history', icon: History }
];

function winnerModeLabel(mode) {
  if (mode === 'middle') return 'Middle winner';
  if (mode === 'last') return 'Last winner';
  return 'Highest winner';
}

function HubHeaderCard() {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-slate-900">Auction history hub</h1>
    </section>
  );
}

function SummaryCard({ label, value, icon: Icon, btct = false }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {btct ? <BtctCoinLogo size={14} className="shrink-0" /> : <Icon size={14} className="text-slate-500" />}
        {label}
      </div>
      <p className="mt-2 text-[17px] font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function SectionCard({ title, children, btct = false }) {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        {btct ? <BtctCoinLogo size={16} className="shrink-0" /> : null}
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HubTabButton({ active, tab, onClick }) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${active ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]' : 'border border-slate-200 bg-white text-slate-700'}`}
    >
      {tab.value === 'btct' || tab.value === 'staking' ? <BtctCoinLogo size={14} className="shrink-0" /> : <Icon size={14} />}
      {tab.label}
    </button>
  );
}

function AuctionGrid({ items = [], emptyTitle }) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((auction) => <AuctionCard key={`${auction.id}-${auction.status || 'history'}`} auction={auction} />)}
    </div>
  );
}

function LedgerList({ items = [], emptyTitle, renderItem }) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} />;
  }

  return (
    <div className="space-y-2.5">
      {items.map(renderItem)}
    </div>
  );
}

function AuctionHistoryHubContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('bids');

  useEffect(() => {
    const requested = searchParams.get('kind');
    if (requested === 'joined' || requested === 'history') {
      setActiveTab('history');
      return;
    }
    if (requested === 'wins') {
      setActiveTab('wins');
      return;
    }
    if (requested === 'bids') {
      setActiveTab('bids');
    }
  }, [searchParams]);

  const [bidsQuery, winsQuery, historyQuery, joinedQuery, walletQuery, stakingQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.auctionHistory('bids'), queryFn: () => getMyAuctionHistory({ kind: 'bids', page: 1, limit: 100 }) },
      { queryKey: queryKeys.auctionHistory('wins'), queryFn: () => getMyAuctionHistory({ kind: 'wins', page: 1, limit: 100 }) },
      { queryKey: queryKeys.auctionHistory('history'), queryFn: () => getMyAuctionHistory({ kind: 'history', page: 1, limit: 100 }) },
      { queryKey: queryKeys.auctionHistory('joined'), queryFn: () => getMyAuctionHistory({ kind: 'joined', page: 1, limit: 100 }) },
      { queryKey: queryKeys.wallet, queryFn: getWallet },
      { queryKey: queryKeys.walletStaking, queryFn: getBtctStakingSummary }
    ]
  });

  const hasError = [bidsQuery, winsQuery, historyQuery, joinedQuery, walletQuery, stakingQuery].some((query) => query.isError);

  if (hasError) {
    return (
      <ErrorState
        message="Auction hub data could not be loaded."
        onRetry={() => {
          bidsQuery.refetch();
          winsQuery.refetch();
          historyQuery.refetch();
          joinedQuery.refetch();
          walletQuery.refetch();
          stakingQuery.refetch();
        }}
      />
    );
  }

  const bidsEnvelope = bidsQuery.data || {};
  const winsEnvelope = winsQuery.data || {};
  const historyEnvelope = historyQuery.data || {};
  const joinedEnvelope = joinedQuery.data || {};
  const walletData = walletQuery.data || {};
  const stakingData = stakingQuery.data?.data || {};

  const bids = Array.isArray(bidsEnvelope.data) ? bidsEnvelope.data : [];
  const wins = Array.isArray(winsEnvelope.data) ? winsEnvelope.data : [];
  const allHistory = Array.isArray(historyEnvelope.data) ? historyEnvelope.data : [];
  const joined = Array.isArray(joinedEnvelope.data) ? joinedEnvelope.data : [];
  const btctTransactions = Array.isArray(walletData.btctTransactions) ? walletData.btctTransactions : [];
  const stakingPlan = stakingData.plan || null;
  const stakingPayouts = Array.isArray(stakingData.payouts) ? stakingData.payouts : [];
  const wallet = walletData.wallet || {};

  const btctAuctionTransactions = useMemo(() => {
    return btctTransactions.filter((tx) => String(tx.source || '').includes('auction') || String(tx.source || '').includes('btct'));
  }, [btctTransactions]);

  const summary = {
    bids: bidsEnvelope.summary || {},
    wins: winsEnvelope.summary || {},
    history: historyEnvelope.summary || {}
  };

  return (
    <div className="space-y-4">
      <HubHeaderCard />

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="My Bids" value={number(summary.bids.my_bids ?? bids.length)} icon={Gavel} />
        <SummaryCard label="My Winning" value={number(summary.wins.won_auctions ?? wins.length)} icon={Trophy} />
        <SummaryCard label="BTCT Available" value={`${number(wallet.btct_available_balance ?? wallet.btct_wallet_balance ?? wallet.btct_balance ?? 0)} BTCT`} icon={BtctCoinLogo} btct />
        <SummaryCard label="Staking Income" value={currency(stakingPayouts.reduce((sum, item) => sum + Number(item.payout_amount_usd || 0), 0))} icon={Clock3} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hubTabs.map((tab) => (
          <HubTabButton key={tab.value} tab={tab} active={activeTab === tab.value} onClick={() => setActiveTab(tab.value)} />
        ))}
      </div>

      {activeTab === 'bids' ? (
        <SectionCard title="My Bids">
          {bidsQuery.isLoading ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading bid history...</div>
          ) : (
            <AuctionGrid items={bids} emptyTitle="No bids yet" />
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'wins' ? (
        <div className="space-y-4">
          <SectionCard title="My Winning">
            {winsQuery.isLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading winning records...</div>
            ) : (
              <AuctionGrid items={wins} emptyTitle="No winning auctions yet" />
            )}
          </SectionCard>

          <SectionCard title="Winning History">
            {winsQuery.isLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading winning history...</div>
            ) : (
              <LedgerList
                items={wins}
                emptyTitle="No completed winning history"
                renderItem={(item) => (
                  <div key={`win-${item.id}`} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{item.title || item.product_name || 'Auction win'}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{item.end_at ? dateTime(item.end_at) : 'Completed result'}</p>
                        {Array.isArray(item.winners) && item.winners.length ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {item.winners.map((winner) => winnerModeLabel(winner.winner_mode)).join(', ')}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">Winner</span>
                    </div>
                  </div>
                )}
              />
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'btct' ? (
        <SectionCard title="BTCT Coin" btct>
          {walletQuery.isLoading ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading BTCT records...</div>
          ) : (
            <LedgerList
              items={btctAuctionTransactions}
              emptyTitle="No BTCT records yet"
              renderItem={(tx) => (
                <div key={tx.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-900"><BtctCoinLogo size={14} className="shrink-0" />{incomeSourceLabel(tx.source || 'btct_transaction')}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{dateTime(tx.created_at)}</p>
                    </div>
                    <p className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-900"><BtctCoinLogo size={14} className="shrink-0" />+ {number(tx.amount)} BTCT</p>
                  </div>
                </div>
              )}
            />
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'staking' ? (
        <SectionCard title="Staking" btct>
          {stakingQuery.isLoading ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading staking records...</div>
          ) : stakingPlan ? (
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Staked Amount" value={`${number(stakingPlan.staking_amount_btct || 0)} BTCT`} icon={BtctCoinLogo} btct />
              <SummaryCard label="Status" value={String(stakingPlan.status || 'active').replace(/^\w/, (c) => c.toUpperCase())} icon={Clock3} />
              <SummaryCard label="Blocks" value={number(stakingPlan.staked_blocks || 0)} icon={Sparkles} />
              <SummaryCard label="Next Payout" value={stakingPlan.next_payout_at ? dateTime(stakingPlan.next_payout_at) : 'Not scheduled'} icon={Clock3} />
            </div>
          ) : (
            <EmptyState title="No active staking record" />
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'income' ? (
        <SectionCard title="Staking Income" btct>
          {stakingQuery.isLoading ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading staking income...</div>
          ) : (
            <LedgerList
              items={stakingPayouts}
              emptyTitle="No staking income yet"
              renderItem={(item) => (
                <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900">Cycle #{item.cycle_number} {item.cycle_key ? `(${item.cycle_key})` : ''}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{dateTime(item.payout_date)}</p>
                    </div>
                    <p className="text-[13px] font-semibold text-emerald-700">+ {currency(item.payout_amount_usd)}</p>
                  </div>
                </div>
              )}
            />
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'history' ? (
        <div className="space-y-4">
          <SectionCard title="Auction History">
            {joinedQuery.isLoading || historyQuery.isLoading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading auction history...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[12px] font-semibold text-slate-900">Joined Auctions</p>
                  <AuctionGrid items={joined} emptyTitle="No joined auctions yet" />
                </div>
                <div>
                  <p className="mb-3 text-[12px] font-semibold text-slate-900">Completed / Result History</p>
                  <AuctionGrid items={allHistory} emptyTitle="No completed auction history yet" />
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

export default function AuctionHistoryPage() {
  return (
    <Suspense fallback={<div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auction hub...</div>}>
      <AuctionHistoryHubContent />
    </Suspense>
  );
}
