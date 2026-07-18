import { Footer } from '@/components/shared/Footer';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}
