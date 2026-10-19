import Header from "@/components/navigation/Header";
import PortfolioContent from "@/components/sections/PortfolioContent";
import SceneLoader from "@/components/scene/SceneLoader";
import { MotionProvider } from "@/components/scene/MotionProvider";
import { profile, sections } from "@/lib/profile";
export default function Home() {
  const person = { "@context": "https://schema.org", "@type": "Person", name: profile.name, jobTitle: profile.role, email: `mailto:${profile.email}`, sameAs: [profile.linkedin], address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" } };
  return <MotionProvider><SceneLoader /><Header /><noscript><nav className="no-js-navigation" aria-label="Section navigation">{sections.filter(s => s.id !== "top").map(s => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}</nav></noscript><PortfolioContent /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} /></MotionProvider>;
}
