import { Hero } from '@/components/home/Hero';
import { CapabilityStrip } from '@/components/home/CapabilityStrip';
import { EnterpriseProblem } from '@/components/home/EnterpriseProblem';
import { PayrollModes } from '@/components/home/PayrollModes';
import { BatchFlow } from '@/components/home/BatchFlow';
import { Personas } from '@/components/home/Personas';
import { ProtocolArchitecture } from '@/components/home/ProtocolArchitecture';
import { ProofAndPrivacy } from '@/components/home/ProofAndPrivacy';
import { BuiltCoverage } from '@/components/home/BuiltCoverage';
import { CTA } from '@/components/home/CTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <CapabilityStrip />
      <EnterpriseProblem />
      <PayrollModes />
      <BatchFlow />
      <Personas />
      <ProtocolArchitecture />
      <ProofAndPrivacy />
      <BuiltCoverage />
      <CTA />
    </>
  );
}
