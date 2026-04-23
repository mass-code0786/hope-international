const SIDES = ['left', 'right'];

function normalizePlacementSide(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return SIDES.includes(normalized) ? normalized : null;
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toTimestamp(value) {
  const iso = toIso(value);
  if (!iso) return 0;
  return new Date(iso).getTime();
}

function childColumn(side) {
  return side === 'left' ? 'left_child_id' : 'right_child_id';
}

function otherSide(side) {
  return side === 'left' ? 'right' : 'left';
}

function getChildId(node, side) {
  if (!node || !side) return null;
  return node[childColumn(side)] || null;
}

function setChildId(node, side, childId) {
  if (!node || !side) return;
  node[childColumn(side)] = childId || null;
}

function compareByCreatedAt(a, b) {
  if (a.created_at_ms !== b.created_at_ms) return a.created_at_ms - b.created_at_ms;
  return String(a.id).localeCompare(String(b.id));
}

function labelNode(byId, userId) {
  if (!userId) return 'null';
  const user = byId.get(userId);
  const shortId = String(userId).slice(0, 8);
  if (!user) return shortId;
  return user.username ? `${user.username}[${shortId}]` : shortId;
}

function buildTraceResult(ancestorId, edges, issue = null, source = 'parent_chain') {
  const rootLeg = normalizePlacementSide(edges[0]?.side);
  return {
    found: Boolean(rootLeg),
    issue,
    source,
    rootLeg,
    edges,
    pathUserIds: rootLeg ? [ancestorId, ...edges.map((edge) => edge.nodeId)] : [],
    switchedSides: rootLeg ? edges.filter((edge) => normalizePlacementSide(edge.side) !== rootLeg) : []
  };
}

function formatTrace(trace, byId) {
  if (!trace?.pathUserIds?.length) return '';
  const parts = [labelNode(byId, trace.pathUserIds[0])];
  for (const edge of trace.edges) {
    parts.push(`${String(edge.side || '?').toUpperCase()}:${labelNode(byId, edge.nodeId)}`);
  }
  return parts.join(' -> ');
}

function normalizeUserRows(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    username: row.username || '',
    sponsor_id: row.sponsor_id || null,
    parent_id: row.parent_id || null,
    placement_side: normalizePlacementSide(row.placement_side),
    left_child_id: row.left_child_id || null,
    right_child_id: row.right_child_id || null,
    self_pv: toMoney(row.self_pv),
    carry_left_pv: toMoney(row.carry_left_pv),
    carry_right_pv: toMoney(row.carry_right_pv),
    total_left_pv: toMoney(row.total_left_pv),
    total_right_pv: toMoney(row.total_right_pv),
    lifetime_bv: toMoney(row.lifetime_bv),
    rank_id: row.rank_id == null ? null : Number(row.rank_id),
    created_at: toIso(row.created_at),
    created_at_ms: toTimestamp(row.created_at)
  })).sort(compareByCreatedAt);
}

function normalizeOrderRows(rows = []) {
  return rows
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      settled_at: toIso(row.settled_at),
      settled_at_ms: toTimestamp(row.settled_at),
      qualifying_pv: toMoney(row.qualifying_pv),
      qualifying_bv: toMoney(row.qualifying_bv)
    }))
    .sort((a, b) => {
      if (a.settled_at_ms !== b.settled_at_ms) return a.settled_at_ms - b.settled_at_ms;
      return String(a.id).localeCompare(String(b.id));
    });
}

function normalizeLedgerRows(rows = []) {
  return rows.map((row) => ({
    ancestor_user_id: row.ancestor_user_id,
    source_user_id: row.source_user_id,
    order_id: row.order_id,
    leg: normalizePlacementSide(row.leg),
    pv: toMoney(row.pv),
    bv: toMoney(row.bv),
    created_at: toIso(row.created_at),
    created_at_ms: toTimestamp(row.created_at)
  }));
}

function normalizeWeeklyCycles(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    cycle_start: String(row.cycle_start),
    cycle_end: String(row.cycle_end),
    closed_at: toIso(row.closed_at),
    closed_at_ms: toTimestamp(row.closed_at)
  }));
}

function normalizeMonthlyCycles(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    month_start: String(row.month_start),
    month_end: String(row.month_end)
  }));
}

function normalizeRanks(rows = []) {
  return rows
    .map((row) => ({
      id: Number(row.id),
      name: row.name,
      min_bv: toMoney(row.min_bv)
    }))
    .sort((a, b) => a.min_bv - b.min_bv || a.id - b.id);
}

function buildUserIndex(users = []) {
  const byId = new Map();
  for (const user of users) {
    byId.set(user.id, { ...user });
  }
  return byId;
}

function inspectParentChildIntegrity(byId, user) {
  if (!user.parent_id) {
    if (user.placement_side) return 'root_user_has_placement_side';
    return null;
  }

  if (!user.placement_side) return 'missing_placement_side';

  const parent = byId.get(user.parent_id);
  if (!parent) return 'missing_parent';

  const expectedChildId = getChildId(parent, user.placement_side);
  if (expectedChildId === user.id) return null;

  if (getChildId(parent, otherSide(user.placement_side)) === user.id) {
    return 'parent_child_side_mismatch';
  }

  return 'parent_child_pointer_mismatch';
}

function tracePathToSponsorByParents(byId, user) {
  if (!user?.sponsor_id) {
    return {
      found: !user?.parent_id,
      issue: user?.parent_id ? 'root_user_has_parent' : null,
      source: 'parent_chain',
      rootLeg: null,
      edges: [],
      pathUserIds: [],
      switchedSides: []
    };
  }

  const edgesUp = [];
  const visited = new Set();
  let current = user;

  while (current) {
    if (visited.has(current.id)) {
      return {
        found: false,
        issue: 'cycle_detected',
        source: 'parent_chain',
        rootLeg: null,
        edges: [],
        pathUserIds: [],
        switchedSides: []
      };
    }

    visited.add(current.id);

    if (!current.parent_id) {
      return {
        found: false,
        issue: 'sponsor_not_ancestor',
        source: 'parent_chain',
        rootLeg: null,
        edges: edgesUp.slice().reverse(),
        pathUserIds: [],
        switchedSides: []
      };
    }

    edgesUp.push({
      nodeId: current.id,
      parentId: current.parent_id,
      side: normalizePlacementSide(current.placement_side)
    });

    if (current.parent_id === user.sponsor_id) {
      return buildTraceResult(user.sponsor_id, edgesUp.slice().reverse(), null, 'parent_chain');
    }

    const parent = byId.get(current.parent_id);
    if (!parent) {
      return {
        found: false,
        issue: 'missing_parent',
        source: 'parent_chain',
        rootLeg: null,
        edges: edgesUp.slice().reverse(),
        pathUserIds: [],
        switchedSides: []
      };
    }

    current = parent;
  }

  return {
    found: false,
    issue: 'sponsor_not_ancestor',
    source: 'parent_chain',
    rootLeg: null,
    edges: edgesUp.slice().reverse(),
    pathUserIds: [],
    switchedSides: []
  };
}

function tracePathToSponsorByChildren(byId, sponsorId, userId) {
  if (!sponsorId || !userId || sponsorId === userId) {
    return {
      found: false,
      issue: 'invalid_child_trace_request',
      source: 'child_links',
      rootLeg: null,
      edges: [],
      pathUserIds: [],
      switchedSides: []
    };
  }

  const visited = new Set();
  const stack = [{ nodeId: sponsorId, edges: [] }];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    const node = byId.get(current.nodeId);
    if (!node) continue;

    for (const side of [...SIDES].reverse()) {
      const childId = getChildId(node, side);
      if (!childId) continue;

      const edges = current.edges.concat({
        nodeId: childId,
        parentId: current.nodeId,
        side
      });

      if (childId === userId) {
        return buildTraceResult(sponsorId, edges, null, 'child_links');
      }

      stack.push({ nodeId: childId, edges });
    }
  }

  return {
    found: false,
    issue: 'sponsor_not_ancestor',
    source: 'child_links',
    rootLeg: null,
    edges: [],
    pathUserIds: [],
    switchedSides: []
  };
}

function findSameLegPlacementInTree(byId, sponsorId, leg) {
  const normalizedLeg = normalizePlacementSide(leg);
  if (!normalizedLeg) return null;

  let current = byId.get(sponsorId);
  const visited = new Set();

  while (current) {
    if (visited.has(current.id)) {
      return null;
    }

    visited.add(current.id);

    const nextId = getChildId(current, normalizedLeg);
    if (!nextId) {
      return {
        parentId: current.id,
        placementSide: normalizedLeg
      };
    }

    current = byId.get(nextId);
  }

  return null;
}

function buildExpectedTree(users, inferenceById) {
  const expectedById = new Map();
  const unresolved = [];

  for (const user of users) {
    if (user.sponsor_id) continue;
    expectedById.set(user.id, {
      ...user,
      parent_id: null,
      placement_side: null,
      left_child_id: null,
      right_child_id: null
    });
  }

  let pending = users.filter((user) => Boolean(user.sponsor_id));

  while (pending.length) {
    const nextPending = [];
    let progress = false;

    for (const user of pending) {
      const inference = inferenceById.get(user.id) || {};
      const intendedLeg = normalizePlacementSide(inference.intendedLeg);
      if (!intendedLeg) {
        unresolved.push({
          userId: user.id,
          sponsorId: user.sponsor_id || null,
          type: 'unresolved_intended_leg',
          reason: inference.unresolvedReason || 'Unable to infer sponsor main leg from current tree'
        });
        continue;
      }

      if (!expectedById.has(user.sponsor_id)) {
        nextPending.push(user);
        continue;
      }

      const slot = findSameLegPlacementInTree(expectedById, user.sponsor_id, intendedLeg);
      if (!slot) {
        unresolved.push({
          userId: user.id,
          sponsorId: user.sponsor_id || null,
          type: 'missing_same_leg_slot',
          reason: `Could not resolve ${intendedLeg} leg chain for sponsor ${user.sponsor_id}`
        });
        continue;
      }

      const nextUser = {
        ...user,
        parent_id: slot.parentId,
        placement_side: intendedLeg,
        left_child_id: null,
        right_child_id: null
      };

      expectedById.set(user.id, nextUser);
      setChildId(expectedById.get(slot.parentId), intendedLeg, user.id);
      progress = true;
    }

    if (!progress) {
      for (const user of nextPending) {
        unresolved.push({
          userId: user.id,
          sponsorId: user.sponsor_id || null,
          type: 'sponsor_not_processed',
          reason: `Sponsor ${user.sponsor_id} could not be reconstructed before replaying this user`
        });
      }
      break;
    }

    pending = nextPending;
  }

  for (const user of users) {
    if (!expectedById.has(user.id)) {
      expectedById.set(user.id, {
        ...user,
        left_child_id: user.left_child_id || null,
        right_child_id: user.right_child_id || null
      });
    }
  }

  return {
    expectedById,
    unresolved
  };
}

function collectDuplicateChildReferences(byId) {
  const seen = new Map();
  const duplicates = [];

  for (const user of byId.values()) {
    for (const side of SIDES) {
      const childId = getChildId(user, side);
      if (!childId) continue;

      if (!seen.has(childId)) {
        seen.set(childId, [{ parentId: user.id, side }]);
        continue;
      }

      const list = seen.get(childId);
      list.push({ parentId: user.id, side });
      duplicates.push({
        childId,
        parents: list.slice()
      });
    }
  }

  return duplicates;
}

function validateTree(byId, users) {
  let orphanedUsers = 0;
  let sponsorAncestorFailures = 0;
  let sameLegViolations = 0;
  let brokenParentChildLinks = 0;

  for (const user of users) {
    const node = byId.get(user.id);
    if (!node) continue;

    const integrityIssue = inspectParentChildIntegrity(byId, node);
    if (integrityIssue) {
      if (integrityIssue === 'missing_parent') orphanedUsers += 1;
      brokenParentChildLinks += 1;
    }

    if (!node.sponsor_id) continue;

    const trace = tracePathToSponsorByParents(byId, node);
    if (!trace.found) {
      sponsorAncestorFailures += 1;
      continue;
    }

    if (trace.switchedSides.length) {
      sameLegViolations += 1;
    }
  }

  return {
    orphanedUsers,
    sponsorAncestorFailures,
    sameLegViolations,
    brokenParentChildLinks,
    duplicateChildReferences: collectDuplicateChildReferences(byId).length
  };
}

function buildPlacementSignature(users = []) {
  return users
    .map((user) => [
      user.id,
      user.parent_id || '',
      user.placement_side || '',
      user.left_child_id || '',
      user.right_child_id || ''
    ].join(':'))
    .sort()
    .join('|');
}

function resolveReason({ inference, parentChanged, childLinksChanged, unresolved }) {
  if (unresolved) {
    return inference.unresolvedReason || 'The current tree does not expose a safe sponsor leg inference for this user';
  }

  if (inference.directViolation) {
    return 'Current sponsor path switches into the opposite descendant leg, so the user must be replayed onto the original sponsor leg chain';
  }

  if (parentChanged) {
    return 'Earlier same-leg violations displaced this user, so replaying registrations in order moves the user to the correct chain position';
  }

  if (childLinksChanged) {
    return 'Parent and child pointers are being rebuilt to match the corrected binary structure';
  }

  if (inference.integrityIssue) {
    return `Current tree link integrity issue detected: ${inference.integrityIssue}`;
  }

  return 'No repair action required';
}

function buildUserVolumes(users = []) {
  const volumes = new Map();
  for (const user of users) {
    volumes.set(user.id, {
      userId: user.id,
      selfPv: 0,
      carryLeftPv: 0,
      carryRightPv: 0,
      totalLeftPv: 0,
      totalRightPv: 0,
      lifetimeBv: 0,
      suggestedRankId: user.rank_id || null
    });
  }
  return volumes;
}

function resolveSuggestedRankId(ranks, lifetimeBv, fallbackRankId = null) {
  if (!Array.isArray(ranks) || !ranks.length) return fallbackRankId;
  let selected = ranks[0];
  for (const rank of ranks) {
    if (lifetimeBv >= rank.min_bv) {
      selected = rank;
    } else {
      break;
    }
  }
  return selected?.id || fallbackRankId;
}

function computeCorrectedVolumePlan({ users, correctedById, settledOrders, weeklyCycles, ranks }) {
  const latestWeeklyClosedAtMs = weeklyCycles.length
    ? Math.max(...weeklyCycles.map((cycle) => cycle.closed_at_ms || 0))
    : 0;
  const userVolumes = buildUserVolumes(users);
  const correctedLedgerEntries = [];

  for (const order of settledOrders) {
    if (order.qualifying_pv <= 0 && order.qualifying_bv <= 0) continue;

    const source = correctedById.get(order.user_id);
    if (!source) continue;

    const sourceVolumes = userVolumes.get(order.user_id);
    if (sourceVolumes) {
      sourceVolumes.selfPv = toMoney(sourceVolumes.selfPv + order.qualifying_pv);
      sourceVolumes.lifetimeBv = toMoney(sourceVolumes.lifetimeBv + order.qualifying_bv);
    }

    let current = source;
    while (current?.parent_id) {
      const ancestor = correctedById.get(current.parent_id);
      const leg = normalizePlacementSide(current.placement_side);
      if (!ancestor || !leg) break;

      correctedLedgerEntries.push({
        ancestor_user_id: ancestor.id,
        source_user_id: order.user_id,
        order_id: order.id,
        leg,
        pv: order.qualifying_pv,
        bv: order.qualifying_bv,
        created_at: order.settled_at,
        created_at_ms: order.settled_at_ms
      });

      const ancestorVolumes = userVolumes.get(ancestor.id);
      if (ancestorVolumes) {
        if (leg === 'left') {
          ancestorVolumes.totalLeftPv = toMoney(ancestorVolumes.totalLeftPv + order.qualifying_pv);
          if (!latestWeeklyClosedAtMs || order.settled_at_ms > latestWeeklyClosedAtMs) {
            ancestorVolumes.carryLeftPv = toMoney(ancestorVolumes.carryLeftPv + order.qualifying_pv);
          }
        } else {
          ancestorVolumes.totalRightPv = toMoney(ancestorVolumes.totalRightPv + order.qualifying_pv);
          if (!latestWeeklyClosedAtMs || order.settled_at_ms > latestWeeklyClosedAtMs) {
            ancestorVolumes.carryRightPv = toMoney(ancestorVolumes.carryRightPv + order.qualifying_pv);
          }
        }

        ancestorVolumes.lifetimeBv = toMoney(ancestorVolumes.lifetimeBv + order.qualifying_bv);
      }

      current = ancestor;
    }
  }

  for (const user of users) {
    const volume = userVolumes.get(user.id);
    if (!volume) continue;
    volume.suggestedRankId = resolveSuggestedRankId(ranks, volume.lifetimeBv, user.rank_id || null);
  }

  return {
    latestWeeklyClosedAt: latestWeeklyClosedAtMs ? new Date(latestWeeklyClosedAtMs).toISOString() : null,
    correctedLedgerEntries,
    userVolumes
  };
}

function buildLedgerMap(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const key = [
      entry.ancestor_user_id,
      entry.source_user_id,
      entry.order_id,
      entry.leg || ''
    ].join('|');
    const existing = map.get(key) || {
      ancestor_user_id: entry.ancestor_user_id,
      source_user_id: entry.source_user_id,
      order_id: entry.order_id,
      leg: entry.leg,
      pv: 0,
      bv: 0,
      created_at_ms: entry.created_at_ms || 0
    };
    existing.pv = toMoney(existing.pv + entry.pv);
    existing.bv = toMoney(existing.bv + entry.bv);
    existing.created_at_ms = Math.max(existing.created_at_ms, entry.created_at_ms || 0);
    map.set(key, existing);
  }
  return map;
}

function deriveImpactedCycles(changedEntries, weeklyCycles, monthlyCycles) {
  const impactedWeekly = new Set();
  const impactedMonthly = new Set();

  for (const entry of changedEntries) {
    const entryDate = entry.created_at_ms ? new Date(entry.created_at_ms) : null;
    if (!entryDate) continue;

    const entryDay = entryDate.toISOString().slice(0, 10);
    for (const cycle of weeklyCycles) {
      if (entryDay >= cycle.cycle_start && entryDay <= cycle.cycle_end) {
        impactedWeekly.add(cycle.id);
      }
    }

    for (const cycle of monthlyCycles) {
      if (entryDay >= cycle.month_start && entryDay <= cycle.month_end) {
        impactedMonthly.add(cycle.id);
      }
    }
  }

  return {
    impactedWeeklyCycleIds: [...impactedWeekly],
    impactedMonthlyCycleIds: [...impactedMonthly]
  };
}

function buildCompensationImpact({
  users,
  currentVolumeLedger,
  correctedLedgerEntries,
  currentVolumesByUser,
  correctedUserVolumes,
  weeklyCycles,
  monthlyCycles
}) {
  const currentLedgerMap = buildLedgerMap(currentVolumeLedger);
  const correctedLedgerMap = buildLedgerMap(correctedLedgerEntries);
  const allKeys = new Set([...currentLedgerMap.keys(), ...correctedLedgerMap.keys()]);
  const changedEntries = [];
  const changedOrders = new Set();
  const impactedAncestors = new Set();

  for (const key of allKeys) {
    const current = currentLedgerMap.get(key);
    const corrected = correctedLedgerMap.get(key);
    const currentPv = toMoney(current?.pv || 0);
    const correctedPv = toMoney(corrected?.pv || 0);
    const currentBv = toMoney(current?.bv || 0);
    const correctedBv = toMoney(corrected?.bv || 0);

    if (currentPv === correctedPv && currentBv === correctedBv) continue;

    changedEntries.push({
      key,
      ancestor_user_id: corrected?.ancestor_user_id || current?.ancestor_user_id || null,
      source_user_id: corrected?.source_user_id || current?.source_user_id || null,
      order_id: corrected?.order_id || current?.order_id || null,
      leg: corrected?.leg || current?.leg || null,
      current_pv: currentPv,
      corrected_pv: correctedPv,
      current_bv: currentBv,
      corrected_bv: correctedBv,
      created_at_ms: Math.max(current?.created_at_ms || 0, corrected?.created_at_ms || 0)
    });

    if (corrected?.order_id || current?.order_id) changedOrders.add(corrected?.order_id || current?.order_id);
    if (corrected?.ancestor_user_id || current?.ancestor_user_id) impactedAncestors.add(corrected?.ancestor_user_id || current?.ancestor_user_id);
  }

  const changedUserVolumes = [];
  const rankChanges = [];

  for (const user of users) {
    const current = currentVolumesByUser.get(user.id) || {};
    const corrected = correctedUserVolumes.get(user.id) || {};
    const delta = {
      userId: user.id,
      currentSelfPv: toMoney(current.self_pv),
      correctedSelfPv: toMoney(corrected.selfPv),
      currentCarryLeftPv: toMoney(current.carry_left_pv),
      correctedCarryLeftPv: toMoney(corrected.carryLeftPv),
      currentCarryRightPv: toMoney(current.carry_right_pv),
      correctedCarryRightPv: toMoney(corrected.carryRightPv),
      currentTotalLeftPv: toMoney(current.total_left_pv),
      correctedTotalLeftPv: toMoney(corrected.totalLeftPv),
      currentTotalRightPv: toMoney(current.total_right_pv),
      correctedTotalRightPv: toMoney(corrected.totalRightPv),
      currentLifetimeBv: toMoney(current.lifetime_bv),
      correctedLifetimeBv: toMoney(corrected.lifetimeBv)
    };

    const changed = (
      delta.currentSelfPv !== delta.correctedSelfPv
      || delta.currentCarryLeftPv !== delta.correctedCarryLeftPv
      || delta.currentCarryRightPv !== delta.correctedCarryRightPv
      || delta.currentTotalLeftPv !== delta.correctedTotalLeftPv
      || delta.currentTotalRightPv !== delta.correctedTotalRightPv
      || delta.currentLifetimeBv !== delta.correctedLifetimeBv
    );

    if (changed) {
      changedUserVolumes.push(delta);
    }

    if ((current.rank_id || null) !== (corrected.suggestedRankId || null)) {
      rankChanges.push({
        userId: user.id,
        currentRankId: current.rank_id || null,
        correctedRankId: corrected.suggestedRankId || null
      });
    }
  }

  const impactedCycles = deriveImpactedCycles(changedEntries, weeklyCycles, monthlyCycles);

  return {
    recalcRequired: Boolean(changedEntries.length || changedUserVolumes.length || rankChanges.length),
    changedLedgerEntryCount: changedEntries.length,
    changedOrderCount: changedOrders.size,
    impactedAncestorCount: impactedAncestors.size,
    changedUserVolumeCount: changedUserVolumes.length,
    rankChangeCount: rankChanges.length,
    impactedWeeklyCycleIds: impactedCycles.impactedWeeklyCycleIds,
    impactedMonthlyCycleIds: impactedCycles.impactedMonthlyCycleIds,
    changedEntries,
    changedUserVolumes,
    rankChanges
  };
}

function analyzeBinaryTreeRepair({
  users: rawUsers,
  settledOrders: rawSettledOrders = [],
  currentVolumeLedger: rawCurrentVolumeLedger = [],
  weeklyCycles: rawWeeklyCycles = [],
  monthlyCycles: rawMonthlyCycles = [],
  ranks: rawRanks = []
} = {}) {
  const users = normalizeUserRows(rawUsers);
  const settledOrders = normalizeOrderRows(rawSettledOrders);
  const currentVolumeLedger = normalizeLedgerRows(rawCurrentVolumeLedger);
  const weeklyCycles = normalizeWeeklyCycles(rawWeeklyCycles);
  const monthlyCycles = normalizeMonthlyCycles(rawMonthlyCycles);
  const ranks = normalizeRanks(rawRanks);

  const currentById = buildUserIndex(users);
  const currentVolumesByUser = new Map(users.map((user) => [user.id, user]));
  const inferenceById = new Map();

  for (const user of users) {
    const integrityIssue = inspectParentChildIntegrity(currentById, user);
    let trace = null;
    let unresolvedReason = null;
    let directViolation = false;

    if (user.sponsor_id) {
      trace = tracePathToSponsorByParents(currentById, user);
      if (!trace.found) {
        const fallback = tracePathToSponsorByChildren(currentById, user.sponsor_id, user.id);
        if (fallback.found) {
          trace = fallback;
        }
      }

      if (!trace.found) {
        unresolvedReason = trace.issue || 'sponsor_not_ancestor';
      } else if (!trace.rootLeg) {
        unresolvedReason = 'missing_root_leg';
      } else if (trace.switchedSides.length) {
        directViolation = true;
      }
    } else if (user.parent_id || user.placement_side) {
      unresolvedReason = 'root_user_has_binary_parent_data';
    }

    inferenceById.set(user.id, {
      intendedLeg: trace?.rootLeg || null,
      trace,
      integrityIssue,
      directViolation,
      unresolvedReason
    });
  }

  const expected = buildExpectedTree(users, inferenceById);
  const correctedById = expected.expectedById;
  const unresolvedByUserId = new Map(expected.unresolved.map((item) => [item.userId, item]));
  const currentIntegrity = validateTree(currentById, users);
  const correctedIntegrity = validateTree(correctedById, users);
  const auditLogs = [];

  for (const user of users) {
    const current = currentById.get(user.id);
    const corrected = correctedById.get(user.id) || current;
    const inference = inferenceById.get(user.id) || {};
    const unresolved = unresolvedByUserId.get(user.id);
    const parentChanged = (
      (current?.parent_id || null) !== (corrected?.parent_id || null)
      || normalizePlacementSide(current?.placement_side) !== normalizePlacementSide(corrected?.placement_side)
    );
    const childLinksChanged = (
      (current?.left_child_id || null) !== (corrected?.left_child_id || null)
      || (current?.right_child_id || null) !== (corrected?.right_child_id || null)
    );
    const moveRequired = !unresolved && (parentChanged || childLinksChanged);

    const correctedTrace = user.sponsor_id
      ? tracePathToSponsorByParents(correctedById, corrected)
      : {
          found: !corrected.parent_id,
          rootLeg: null,
          edges: [],
          pathUserIds: [],
          switchedSides: []
        };

    if (!moveRequired && !unresolved && !inference.directViolation && !inference.integrityIssue) {
      continue;
    }

    let violationType = 'child_pointer_rebuild';
    if (unresolved) violationType = unresolved.type;
    else if (inference.directViolation) violationType = 'same_leg_path_switch';
    else if (parentChanged) violationType = 'displaced_by_replay';
    else if (inference.integrityIssue) violationType = inference.integrityIssue;

    auditLogs.push({
      userId: user.id,
      username: user.username,
      sponsorId: user.sponsor_id || null,
      intendedLeg: normalizePlacementSide(inference.intendedLeg),
      currentParentId: current?.parent_id || null,
      currentPlacementSide: normalizePlacementSide(current?.placement_side),
      correctedParentId: corrected?.parent_id || null,
      correctedPlacementSide: normalizePlacementSide(corrected?.placement_side),
      currentLeftChildId: current?.left_child_id || null,
      currentRightChildId: current?.right_child_id || null,
      correctedLeftChildId: corrected?.left_child_id || null,
      correctedRightChildId: corrected?.right_child_id || null,
      moveRequired,
      directViolation: Boolean(inference.directViolation),
      violationType,
      reason: resolveReason({
        inference,
        parentChanged,
        childLinksChanged,
        unresolved: Boolean(unresolved)
      }),
      details: {
        traceSource: inference.trace?.source || null,
        integrityIssue: inference.integrityIssue || null,
        currentPath: inference.trace ? formatTrace(inference.trace, currentById) : '',
        correctedPath: correctedTrace ? formatTrace(correctedTrace, correctedById) : '',
        switchedSides: Array.isArray(inference.trace?.switchedSides)
          ? inference.trace.switchedSides.map((edge) => ({
              nodeId: edge.nodeId,
              parentId: edge.parentId,
              side: edge.side
            }))
          : []
      }
    });
  }

  const moveLogs = auditLogs.filter((log) => log.moveRequired);
  const unresolvedLogs = auditLogs.filter((log) => (
    String(log.violationType || '').startsWith('unresolved_')
    || ['missing_same_leg_slot', 'sponsor_not_processed'].includes(log.violationType)
  ));
  const directViolationLogs = moveLogs.filter((log) => log.directViolation);
  const displacedLogs = moveLogs.filter((log) => !log.directViolation && log.violationType === 'displaced_by_replay');
  const pointerRepairLogs = moveLogs.filter((log) => !log.directViolation && log.violationType !== 'displaced_by_replay');

  const correctedVolumePlan = computeCorrectedVolumePlan({
    users,
    correctedById,
    settledOrders,
    weeklyCycles,
    ranks
  });

  const compensation = unresolvedLogs.length
    ? {
        recalcRequired: null,
        blocked: true,
        reason: 'Compensation impact is not reliable until unresolved sponsor-path anomalies are fixed',
        changedLedgerEntryCount: 0,
        changedOrderCount: 0,
        impactedAncestorCount: 0,
        changedUserVolumeCount: 0,
        rankChangeCount: 0,
        impactedWeeklyCycleIds: [],
        impactedMonthlyCycleIds: [],
        changedEntries: [],
        changedUserVolumes: [],
        rankChanges: []
      }
    : buildCompensationImpact({
        users,
        currentVolumeLedger,
        correctedLedgerEntries: correctedVolumePlan.correctedLedgerEntries,
        currentVolumesByUser,
        correctedUserVolumes: correctedVolumePlan.userVolumes,
        weeklyCycles,
        monthlyCycles
      });

  const examples = moveLogs
    .slice()
    .sort((a, b) => {
      if (Number(b.directViolation) !== Number(a.directViolation)) {
        return Number(b.directViolation) - Number(a.directViolation);
      }
      return String(a.userId).localeCompare(String(b.userId));
    })
    .slice(0, 3)
    .map((log) => ({
      userId: log.userId,
      username: log.username,
      sponsorId: log.sponsorId,
      reason: log.reason,
      currentPath: log.details.currentPath,
      correctedPath: log.details.correctedPath,
      currentParentId: log.currentParentId,
      currentPlacementSide: log.currentPlacementSide,
      correctedParentId: log.correctedParentId,
      correctedPlacementSide: log.correctedPlacementSide
    }));

  return {
    users,
    settledOrders,
    currentVolumeLedger,
    weeklyCycles,
    monthlyCycles,
    ranks,
    currentById,
    correctedById,
    auditLogs,
    moveLogs,
    summary: {
      totalUsers: users.length,
      rootUsers: users.filter((user) => !user.sponsor_id).length,
      sponsoredUsers: users.filter((user) => Boolean(user.sponsor_id)).length,
      unresolvedUsers: unresolvedLogs.length,
      directSameLegViolations: directViolationLogs.length,
      displacedUsers: displacedLogs.length,
      pointerRepairs: pointerRepairLogs.length,
      totalUsersToRewrite: moveLogs.length,
      currentIntegrity,
      correctedIntegrity,
      latestWeeklyCycleClosedAt: correctedVolumePlan.latestWeeklyClosedAt
    },
    examples,
    compensation,
    correctedVolumePlan,
    currentPlacementSignature: buildPlacementSignature(users),
    correctedPlacementSignature: buildPlacementSignature([...correctedById.values()].sort(compareByCreatedAt))
  };
}

function serializeRepairAnalysis(analysis) {
  const correctedUsers = [...analysis.correctedById.values()].sort(compareByCreatedAt);
  return {
    summary: analysis.summary,
    examples: analysis.examples,
    compensation: analysis.compensation,
    moveLogs: analysis.moveLogs,
    auditLogs: analysis.auditLogs,
    currentPlacementSignature: analysis.currentPlacementSignature,
    correctedPlacementSignature: analysis.correctedPlacementSignature,
    currentUsers: analysis.users,
    correctedUsers,
    correctedVolumePlan: {
      latestWeeklyCycleClosedAt: analysis.correctedVolumePlan.latestWeeklyClosedAt,
      correctedLedgerEntryCount: analysis.correctedVolumePlan.correctedLedgerEntries.length,
      userVolumes: [...analysis.correctedVolumePlan.userVolumes.values()]
    }
  };
}

module.exports = {
  analyzeBinaryTreeRepair,
  normalizePlacementSide,
  serializeRepairAnalysis
};
