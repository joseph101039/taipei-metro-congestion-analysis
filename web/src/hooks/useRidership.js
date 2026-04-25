import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRidership } from '../data/api';

function normalizeFlows(flows) {
  const pairs = [];
  for (const [originId, dests] of Object.entries(flows)) {
    for (const [destId, count] of Object.entries(dests)) {
      pairs.push({ originId: Number(originId), destId: Number(destId), count: Number(count) });
    }
  }
  return pairs.sort((a, b) => b.count - a.count);
}

export default function useRidership(date, hour) {
  const cache = useRef(new Map());
  const [flowPairs, setFlowPairs] = useState([]);
  const [totalPassengers, setTotalPassengers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prefetchedDate = useRef(null);

  // Prefetch all 24 hours for the selected date
  const prefetchDate = useCallback(async (d) => {
    if (prefetchedDate.current === d) return;
    prefetchedDate.current = d;
    const BATCH = 4;
    for (let start = 0; start < 24; start += BATCH) {
      const batch = [];
      for (let h = start; h < Math.min(start + BATCH, 24); h++) {
        const key = `${d}|${h}`;
        if (!cache.current.has(key)) {
          batch.push(
            fetchRidership(d, h)
              .then((data) => cache.current.set(key, data))
              .catch(() => {})
          );
        }
      }
      await Promise.allSettled(batch);
    }
  }, []);

  useEffect(() => {
    if (!date) return;
    prefetchDate(date);
  }, [date, prefetchDate]);

  useEffect(() => {
    if (!date || hour == null) return;
    const key = `${date}|${hour}`;
    const cached = cache.current.get(key);
    if (cached) {
      setFlowPairs(normalizeFlows(cached.flows ?? {}));
      setTotalPassengers(cached.total_passengers ?? 0);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRidership(date, hour)
      .then((data) => {
        if (cancelled) return;
        cache.current.set(key, data);
        setFlowPairs(normalizeFlows(data.flows ?? {}));
        setTotalPassengers(data.total_passengers ?? 0);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, hour]);

  return { flowPairs, totalPassengers, loading, error };
}

