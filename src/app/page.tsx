import NeuralGrid from "@/components/NeuralGrid";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import LogoCloud from "@/components/LogoCloud";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import CalendarSection from "@/components/CalendarSection";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";

export default function Home() {
  return (
    <main className="relative">
      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[700px] w-[700px] rounded-full bg-purple-600/[0.12] blur-[180px]" />
        <div className="absolute right-[5%] top-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
          }}
        />
      </div>

      <NeuralGrid />
      <Navigation />
      <HeroSection />
      <LogoCloud />


      <ProblemSolution />


      <Features />


      <HowItWorks />


      <Testimonials />


      <Pricing />


      <CalendarSection />
      <Footer />

      <FloatingChat />
    </main>
  );
}
