import Hero from "@/components/home/hero";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/navigation/footer";

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <Footer />
    </main>
  );
}
