import { ShareCollectionView } from '@/components/share-collection-view';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareCollectionView token={token} />;
}
