'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { TreeNode } from '@/components/team/TreeNode';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminTeamSummary, getAdminTeamTree, getAdminUsersSearch } from '@/lib/services/admin';
import { getMe } from '@/lib/services/authService';

export default function AdminTeamPage() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedLookupUser, setSelectedLookupUser] = useState(null);
  const [depth, setDepth] = useState(2);
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const trimmedSearch = searchInput.trim();
  const searchEnabled = trimmedSearch.length >= 2;
  const userSearchQuery = useQuery({
    queryKey: queryKeys.adminUsersSearch(trimmedSearch, 1, 8),
    queryFn: () => getAdminUsersSearch({ q: trimmedSearch, page: 1, limit: 8 }),
    enabled: searchEnabled
  });
  const searchResults = Array.isArray(userSearchQuery.data?.data) ? userSearchQuery.data.data : [];
  const effectiveUserId = selectedLookupUser?.id || meQuery.data?.id || '';
  const summaryQuery = useQuery({
    queryKey: queryKeys.adminTeamSummary(effectiveUserId),
    queryFn: () => getAdminTeamSummary(effectiveUserId),
    enabled: Boolean(effectiveUserId)
  });
  const treeQuery = useQuery({
    queryKey: queryKeys.adminTeamTree(effectiveUserId, depth),
    queryFn: () => getAdminTeamTree(effectiveUserId, depth),
    enabled: Boolean(effectiveUserId)
  });

  if (meQuery.isLoading || summaryQuery.isLoading || treeQuery.isLoading) return null;
  if (meQuery.isError) return <ErrorState message="Unable to load admin identity." onRetry={meQuery.refetch} />;
  if (summaryQuery.isError) return <ErrorState message="Unable to load team summary." onRetry={summaryQuery.refetch} />;
  if (treeQuery.isError) return <ErrorState message="Unable to load genealogy tree." onRetry={treeQuery.refetch} />;

  const summaryData = summaryQuery.data?.data || {};
  const treeData = treeQuery.data?.data || {};
  const root = treeData.root || null;
  const hasDepth = depth > 1;

  function normalizeTreeNode(node, side = 'Root') {
    return {
      id: node.id,
      name: node.username || node.name || 'Member',
      side: node.placementSide || side,
      status: node.isActive ? 'active' : 'inactive',
      children: Array.isArray(node.children) ? node.children.map((child) => normalizeTreeNode(child, child.placementSide || 'N/A')) : []
    };
  }

  const tree = root ? normalizeTreeNode(root) : null;

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Genealogy Inspector" subtitle="Inspect user placement and binary branch snapshots" />

      <FilterBar>
        <div className="w-full max-w-md">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email, phone, or user ID"
          />
        </div>
        <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value={1}>Depth 1</option>
          <option value={2}>Depth 2</option>
          <option value={3}>Depth 3</option>
          <option value={4}>Depth 4</option>
        </select>
      </FilterBar>
      {trimmedSearch.length > 0 && trimmedSearch.length < 2 ? <p className="text-xs text-muted">Type at least 2 characters to search users.</p> : null}
      {userSearchQuery.isLoading ? <p className="text-xs text-muted">Searching users...</p> : null}
      {userSearchQuery.isError ? <ErrorState message="Unable to search users right now." onRetry={userSearchQuery.refetch} /> : null}
      {searchEnabled && !userSearchQuery.isLoading && !userSearchQuery.isError && searchResults.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No matching users were found for this search. Try name, email, phone, or full user ID."
        />
      ) : null}
      {searchResults.length > 0 ? (
        <div className="card-surface space-y-2 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Search Results</p>
          <div className="grid gap-2 md:grid-cols-2">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLookupUser(item)}
                className="rounded-xl border border-white/10 bg-cardSoft p-3 text-left hover:border-accent/60"
              >
                <p className="text-sm font-semibold text-text">{item.username || 'User'}</p>
                <p className="text-xs text-muted">{item.email || item.phone || item.id}</p>
                <p className="mt-1 text-[11px] text-muted">#{String(item.id || '').slice(0, 8)}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {selectedLookupUser ? (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-cardSoft px-3 py-2">
          <p className="text-sm text-text">
            Inspecting: <span className="font-semibold">{selectedLookupUser.username || selectedLookupUser.id}</span>
          </p>
          <button
            onClick={() => {
              setSelectedLookupUser(null);
              setSearchInput('');
            }}
            className="text-xs text-muted hover:text-text"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel title="Snapshot Coverage" items={[
          { label: 'Tree Depth', value: hasDepth ? `Depth ${depth}` : 'Direct-children level' },
          { label: 'Root User', value: summaryData.user?.username || selectedLookupUser?.username || summaryData.user?.id || meQuery.data?.username || 'N/A' },
          { label: 'Node Count', value: treeData.nodeCount || 0 }
        ]} />

        <SummaryPanel title="Branch Summary" items={[
          { label: 'Left Branch Users', value: summaryData.summary?.left_count || 0 },
          { label: 'Right Branch Users', value: summaryData.summary?.right_count || 0 },
          { label: 'API Mode', value: 'Depth-limited real tree data' }
        ]} />
      </div>

      {tree ? (
        <div className="card-surface p-4">
          <TreeNode node={tree} />
        </div>
      ) : (
        <EmptyState title="No team snapshot" description="No genealogy data is available for this user query." />
      )}
    </div>
  );
}
