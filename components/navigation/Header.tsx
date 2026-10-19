"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sections } from "@/lib/profile";
import { useMotion } from "@/components/scene/MotionProvider";

export function MotionToggle() {
  const { reducedMotion, toggleMotion } = useMotion();
  return <button className="motion-toggle" type="button" onClick={toggleMotion} aria-label={`Motion: ${reducedMotion ? "Reduced" : "Full"}. Change motion preference`}>Motion: <span>{reducedMotion ? "Reduced" : "Full"}</span><span aria-hidden="true" className="toggle-glyph">{reducedMotion ? "○" : "◉"}</span></button>;
}

export default function Header() {
  const [active, setActive] = useState("top");
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const navigating = useRef(false);
  const close = useCallback(() => { dialog.current?.close(); setMenuOpen(false); }, []);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () => document.documentElement.style.setProperty("--measured-header-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    measure(); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--measured-header-height"); };
  }, []);
  useEffect(() => {
    const nodes = sections.map(s => document.getElementById(s.id)).filter((s): s is HTMLElement => !!s);
    const update = () => {
      let current = "top";
      for (const node of nodes) if (node.getBoundingClientRect().top < window.innerHeight * .45) current = node.id;
      setActive(current);
    };
    update(); window.addEventListener("kineticupdate", update); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update);
    return () => { window.removeEventListener("kineticupdate", update); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      navigating.current = dialog.current?.open ?? false;
      close();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [close]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);
  const desktop = ["experience", "research", "approach", "freelance"];
  const navLink = (id: string) => {
    const section = sections.find(s => s.id === id)!;
    return <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{section.label}</a>;
  };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header ref={header} className="site-header">
      <a href="#top" className="wordmark" aria-label="Vishnu Chittampalli, back to top"><strong>VISHNU</strong><span>CHITTAMPALLI</span></a>
      <nav className="desktop-nav" aria-label="Main navigation">{desktop.map(navLink)}<Link className="resume-link" href="/resume">Resume <span aria-hidden="true">↗</span></Link></nav>
      <div className="mobile-actions"><Link href="/resume" className="resume-link">Resume <span aria-hidden="true">↗</span></Link><button ref={trigger} type="button" className="menu-trigger" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => { dialog.current?.showModal(); setMenuOpen(true); }}>Menu <span aria-hidden="true">☰</span></button></div>
    </header>
    <dialog ref={dialog} id="mobile-menu" className="mobile-menu" aria-label="Navigation menu" onCancel={close} onClose={() => { setMenuOpen(false); if (!navigating.current) trigger.current?.focus(); navigating.current = false; }}>
      <div className="menu-heading"><span className="eyebrow">THE INDEX</span><button type="button" className="menu-close" onClick={close} aria-label="Close menu">Close <span aria-hidden="true">×</span></button></div>
      <nav aria-label="Mobile navigation">{sections.filter(section => section.id !== "top").map(section => navLink(section.id))}</nav><MotionToggle />
    </dialog>
    {active !== "top" && active !== "contact" && <div className="chapter-progress" aria-hidden="true"><span>{sections.find(s => s.id === active)?.label} / {sections.find(s => s.id === active)?.number}</span><i><b style={{ width: `${(sections.findIndex(s => s.id === active) + 1) / sections.length * 100}%` }} /></i></div>}
  </>;
}
