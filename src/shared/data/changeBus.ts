// Notifie les abonnés quand une table change — dans l'onglet courant et,
// via BroadcastChannel, dans les autres onglets de la même app.

export interface ChangeBus {
  emit(table: string): void;
  subscribe(table: string, callback: () => void): () => void;
}

export function createChangeBus(channelName?: string): ChangeBus {
  const listeners = new Map<string, Set<() => void>>();

  const dispatch = (table: string) => {
    listeners.get(table)?.forEach((callback) => callback());
  };

  let channel: BroadcastChannel | null = null;
  if (channelName && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<string>) => dispatch(event.data);
    (channel as unknown as { unref?: () => void }).unref?.();
  }

  return {
    emit(table) {
      dispatch(table);
      channel?.postMessage(table);
    },
    subscribe(table, callback) {
      const set = listeners.get(table) ?? new Set();
      set.add(callback);
      listeners.set(table, set);
      return () => {
        set.delete(callback);
      };
    },
  };
}
