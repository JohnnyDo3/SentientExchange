import HeroSection from "@/components/sections/HeroSection";
import AgentConsciousnessStream from "@/components/sections/AgentConsciousnessStream";
import ProblemSolution from "@/components/sections/ProblemSolution";
import LiveTransactionFeed from "@/components/sections/LiveTransactionFeed";
import DataVisualization from "@/components/sections/DataVisualization";
import CallToAction from "@/components/sections/CallToAction";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section with Particle System */}
      <HeroSection />

      {/* Agent Consciousness Stream */}
      <AgentConsciousnessStream />

      {/* Problem/Solution */}
      <ProblemSolution />

      {/* Live Transaction Feed */}
      <LiveTransactionFeed />

      {/* Data Visualization */}
      <DataVisualization />

      {/* Call to Action */}
      <CallToAction />
    </main>
  );
}
