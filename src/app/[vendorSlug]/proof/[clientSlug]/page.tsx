'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ClientProofingView from '@/components/ClientProofingView';

export default function BrandedClientProofingPage() {
  const params = useParams();
  const vendorSlug = (params?.vendorSlug as string) || '';
  const clientSlug = (params?.clientSlug as string) || '';

  return <ClientProofingView vendorSlug={vendorSlug} clientSlug={clientSlug} />;
}
