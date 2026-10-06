"use client";

import { useEffect, useRef, useState } from "react";
import { getStore } from "./getStore";
import type { DataStore } from "./types";

/**
 * Exécute `query` et la relance dès qu'une des `tables` change.
 * `key` identifie la requête (ex. l'id de famille) : quand il change, on
 * recharge. Retourne `undefined` tant que le premier résultat n'est pas là.
 */
export function useStoreQuery<T>(
  key: string,
  query: (store: DataStore) => Promise<T>,
  tables: string[],
  extraSubscribe?: (callback: () => void) => () => void
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const queryRef = useRef(query);
  const extraRef = useRef(extraSubscribe);

  useEffect(() => {
    queryRef.current = query;
    extraRef.current = extraSubscribe;
  });

  const tablesKey = tables.join(",");

  useEffect(() => {
    let cancelled = false;
    const store = getStore();

    const run = () => {
      queryRef.current(store).then(
        (result) => {
          if (!cancelled) setData(result);
        },
        (error: unknown) => console.error("useStoreQuery", key, error)
      );
    };

    run();
    const unsubscribes = tablesKey.split(",").filter(Boolean).map((table) => store.subscribe(table, run));
    if (extraRef.current) unsubscribes.push(extraRef.current(run));

    return () => {
      cancelled = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [key, tablesKey]);

  return data;
}
