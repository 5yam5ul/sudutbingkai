'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ClientProofingView from '@/components/ClientProofingView';

export default function LegacyClientProofingPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  return <ClientProofingView clientSlug={slug} />;
}
