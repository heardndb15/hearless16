import Header from "../components/Header";
import Hero from "../components/Hero";
import FeaturesSection from "../components/Features";
import SubtitleDemo from "../components/SubtitleDemo";
import SoundIndicators from "../components/SoundIndicators";
import LanguageSection from "../components/LanguageSection";
import GamificationSection from "../components/GamificationSection";
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
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
