import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Stats from "../components/Stats";
import FounderStory from "../components/FounderStory";
import Download from "../components/Download";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Stats />
        <FounderStory />
        <Download />
      </main>
      <Footer />
    </>
  );
}
