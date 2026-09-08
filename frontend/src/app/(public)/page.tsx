import Header from "@/components/layout/Header";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import Ecosystem from "@/components/landing/Ecosystem";
import Impact from "@/components/landing/Impact";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Ecosystem />
        <Impact />
      </main>
      <Footer />
    </>
  );
}