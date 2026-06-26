import Header from "../components/Header";
import Hero from "../components/Hero";
import FeaturesSection from "../components/Features";
import SubtitleDemo from "../components/SubtitleDemo";
import SoundIndicators from "../components/SoundIndicators";
import LanguageSection from "../components/LanguageSection";
import GamificationSection from "../components/GamificationSection";
import PricingSection from "../components/PricingSection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeaturesSection />
        <SubtitleDemo />
        <SoundIndicators />
        <LanguageSection />
        <GamificationSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
