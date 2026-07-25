import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { StorySection } from "./StorySection";
import { CommunitySection } from "./CommunitySection";
import { LandingFooter } from "./LandingFooter";

interface LandingPageProps {
  onOpenLogin: () => void;
}

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <div className="landing-page-root">
      <LandingHeader onOpenLogin={onOpenLogin} />
      <main id="main-content">
        <HeroSection onOpenLogin={onOpenLogin} />
        <StorySection />
        <CommunitySection onOpenLogin={onOpenLogin} />
      </main>
      <LandingFooter onOpenLogin={onOpenLogin} />
    </div>
  );
}
