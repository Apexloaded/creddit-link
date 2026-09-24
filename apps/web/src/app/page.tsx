import ExplorerPreview from "@/components/home/explorer-preview";
import Hero from "@/components/home/hero";
import HowCredditWorks from "@/components/home/how-creddit-works";
import RiskAndTransparency from "@/components/home/risk-and-transparency";
import SupportedAssets from "@/components/home/supported-assets";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/navigation/footer";

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <SupportedAssets />
      <ExplorerPreview />
      <HowCredditWorks />
      <RiskAndTransparency />
      <Footer />
    </main>
  );
}
