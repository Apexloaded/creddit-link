"use client"

import { useConnect, useConnection, useConnectors } from 'wagmi'
import { ConnectorItem } from './connector-item'
import { Container } from '../ui/container'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/route';

export function ListConnectors() {
  const router = useRouter();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { isConnected } = useConnection();

  useEffect(() => {
    if (isConnected) {
      router.push(routes.app.dashboard)
    }
  }, [isConnected])

  return (
    <Container className='border border-primary/50 rounded-lg bg-white overflow-hidden shadow-md'>
      {connectors.map((connector, index) => (
        <ConnectorItem key={`${connector.uid}-${index}`} connector={{
          id: connector.uid,
          name: connector.name,
          icon: connector.icon,
          onClick: () => connect({ connector }),
        }} />
      ))}
    </Container>
  )
}
