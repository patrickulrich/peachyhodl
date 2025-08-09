import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    queryClient.resetQueries();
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Always query the selected relay, Damus relay, and Nostr.band relay for better coverage
        const relaysToQuery = new Map();
        relaysToQuery.set(relayUrl.current, filters);
        
        // Always include Damus relay if it's not already the selected relay
        const damusRelay = 'wss://relay.damus.io';
        if (relayUrl.current !== damusRelay) {
          relaysToQuery.set(damusRelay, filters);
        }
        
        // Always include Nostr.band relay for livestream events
        const nostrBandRelay = 'wss://relay.nostr.band';
        if (relayUrl.current !== nostrBandRelay) {
          relaysToQuery.set(nostrBandRelay, filters);
        }
        
        return relaysToQuery;
      },
      eventRouter(_event: NostrEvent) {
        // Publish to the selected relay
        const allRelays = new Set<string>([relayUrl.current]);
        
        // Always include Damus relay for publishing
        allRelays.add('wss://relay.damus.io');

        // Also publish to the preset relays, capped to 5
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);

          if (allRelays.size >= 5) {
            break;
          }
        }

        return [...allRelays];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;