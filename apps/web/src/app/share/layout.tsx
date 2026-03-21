import { TrpcProvider } from '@/components/trpc-provider';

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <div className="min-h-dvh bg-stone-50 dark:bg-stone-900">{children}</div>
    </TrpcProvider>
  );
}
