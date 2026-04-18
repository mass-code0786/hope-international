'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { acknowledgeDepositSuccess, hasAcknowledgedDepositSuccess, isDepositSuccessStatus } from '@/lib/utils/depositSuccess';

function toItems(source) {
  if (Array.isArray(source)) return source;
  return source ? [source] : [];
}

export function useOneTimeDepositSuccess(source, { getEventKey, getAckKeys, getStatus }) {
  const items = useMemo(() => toItems(source), [source]);
  const [queue, setQueue] = useState([]);
  const previousStatusesRef = useRef(new Map());

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current;
    const nextStatuses = new Map();
    const nextQueueEntries = [];

    for (const item of items) {
      const eventKey = getEventKey(item);
      if (!eventKey) continue;

      const status = String(getStatus(item) || '').trim().toLowerCase();
      const previousStatus = previousStatuses.get(eventKey);

      nextStatuses.set(eventKey, status);

      if (previousStatus === undefined) continue;
      if (isDepositSuccessStatus(previousStatus) || !isDepositSuccessStatus(status)) continue;

      const ackKeys = getAckKeys(item);
      if (hasAcknowledgedDepositSuccess(ackKeys)) continue;

      acknowledgeDepositSuccess(ackKeys);
      nextQueueEntries.push({ key: eventKey, item });
    }

    previousStatusesRef.current = nextStatuses;

    if (!nextQueueEntries.length) return;

    setQueue((current) => {
      const existingKeys = new Set(current.map((entry) => entry.key));
      const additions = nextQueueEntries.filter((entry) => !existingKeys.has(entry.key));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [getAckKeys, getEventKey, getStatus, items]);

  return {
    activeDepositSuccess: queue[0]?.item || null,
    showDepositSuccess: queue.length > 0,
    dismissDepositSuccess: () => {
      setQueue((current) => current.slice(1));
    }
  };
}
