'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { studioColor, textColor } from '../../lib/motion/palette';
import { createTimeline, masterAtContent, POSES, type SectionMeasurements, type ExperienceTimeline } from './scene-config';
import { evaluateExperience, stationaryPose, type ExperienceState } from '../../lib/motion/timeline';
import { motionStore } from '../../lib/motion/store';

type Preference='system'|'full'|'reduced';
type MotionContextValue={reducedMotion:boolean;motionEnabled:boolean;preference:Preference;setPreference:(value:Preference)=>void;toggleMotion:()=>void;navigateToSection:(id:string)=>void};
const MotionContext=createContext<MotionContextValue>({reducedMotion:true,motionEnabled:false,preference:'system',setPreference:()=>{},toggleMotion:()=>{},navigateToSection:()=>{}});
export const useMotion=()=>useContext(MotionContext);
declare global { interface Window { __kinetic?:{getState:()=>ExperienceState;timeline:ExperienceTimeline;seek:(pixels:number)=>void;navigate:(id:string)=>void}; } }

export function MotionProvider({children}:{children:ReactNode}){
 const navigationService=useRef<(id:string)=>void>(()=>{});
 const readingPosition=useRef<{offset:number;cinematic:boolean;anchor?:{id:string;top:number}}|null>(null);
 const [preference,updatePreference]=useState<Preference>('system');
 const [systemReduced,setSystemReduced]=useState(true);
 const [initialized,setInitialized]=useState(false);
 const reducedMotion=preference==='reduced'||(preference==='system'&&systemReduced);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setSystemReduced(query.matches);
  const frame=requestAnimationFrame(()=>{ update();try{const saved=localStorage.getItem('kinetic-motion');if(saved==='full'||saved==='reduced'||saved==='system')updatePreference(saved);}catch{}setInitialized(true); });
  query.addEventListener('change',update);
  return()=>{cancelAnimationFrame(frame);query.removeEventListener('change',update);};
 },[]);
 const setPreference=(next:Preference)=>{updatePreference(next);try{localStorage.setItem('kinetic-motion',next);}catch{}};
 useEffect(()=>{
  if(!initialized)return;
  const root=document.documentElement,main=document.querySelector<HTMLElement>('.portfolio-main'),space=document.querySelector<HTMLElement>('[data-scroll-space]');
  if(!main||!space)return;
  const retainedPosition=readingPosition.current;
  let disposed=false,scheduled=0,cinematic=false,failed=root.dataset.sceneFailed==='true',first=true,restoring=false,measured=false;
  let layoutMode:boolean|undefined;
  let journey:{id:string;focus:boolean;origin:number;start:number;duration:number}|null=null,navigationFrame=0;
  const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
  const previousScrollBehavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';
  let timeline=createTimeline({},innerHeight),state=evaluateExperience(timeline,scrollY);
  const positionKey=()=>`kinetic-position:${location.pathname}${location.search}${location.hash}`;
  let savedPosition:{master:number;contentOffset:number;cinematic:boolean}|null=null;
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(root.dataset.restorationApplied!=='true'&&(navigation?.type==='reload'||navigation?.type==='back_forward')) {
   try{savedPosition=JSON.parse(sessionStorage.getItem(positionKey())||'null');}catch{}
  }
  const persist=()=>{try{sessionStorage.setItem(positionKey(),JSON.stringify({master:scrollY,contentOffset:state.contentOffset,cinematic}));}catch{}};
  let readingInset=110;
  root.dataset.motion=reducedMotion?'reduced':'full';
  const elementTop=(el:HTMLElement)=>el.getBoundingClientRect().top-main.getBoundingClientRect().top;
  const publish=()=>{
   if(disposed||document.hidden||!measured)return;
   state=evaluateExperience(timeline,cinematic?scrollY:masterAtContent(timeline,scrollY));
   if(cinematic)main.style.transform=`translate3d(0,${-state.contentOffset}px,0)`;
   else main.style.removeProperty('transform');
   const pose=cinematic?state:stationaryPose({...state,darkness:0},POSES.opening);
   root.dataset.theme=pose.darkness>=.72?'dark':'light';
   root.dataset.chapter=state.chapter;
   const bg=studioColor(pose.darkness);
   root.style.setProperty('--page-fg',textColor(pose.darkness));
   root.style.setProperty('--world-bg',bg);root.style.setProperty('--studio-bg',bg);root.style.setProperty('--page-bg',bg);
   const stage=document.querySelector<HTMLElement>('[data-portfolio-stage]');
   if(stage){stage.dataset.phase=state.phase;stage.dataset.contentOffset=state.contentOffset.toFixed(3);stage.dataset.master=state.master.toFixed(3);stage.dataset.darkness=pose.darkness.toFixed(3);}
   const steps=[...document.querySelectorAll<HTMLElement>('[data-motion-stage]')];let active=steps[0];
   for(const step of steps)if(step.getBoundingClientRect().top<innerHeight*.58)active=step;
   for(const step of steps)step.dataset.active=step===active?'true':'false';
   const headings=[...main.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],li[id]')];
   const readingOffset=cinematic?state.contentOffset:scrollY;
   const readingAnchor=headings.find(el=>{const top=elementTop(el)-readingOffset;return top+el.offsetHeight>readingInset&&top<innerHeight-30;});
   readingPosition.current={offset:readingOffset,cinematic,anchor:readingAnchor?{id:readingAnchor.id,top:elementTop(readingAnchor)-readingOffset}:undefined};
   if(!first)persist();
   root.dataset.motionReady='true';
   motionStore.publish(pose);
   window.dispatchEvent(new Event('kineticupdate'));
  };
  const cancelNavigation=()=>{cancelAnimationFrame(navigationFrame);navigationFrame=0;journey=null;delete root.dataset.navigating;};
  const destinationFor=(id:string)=>{
   const target=document.getElementById(id==='main'?'top':id);if(!target)return null;
   const content=Math.max(0,(timeline.sections[target.id]?.readingTop??elementTop(target))-readingInset);
   const coordinate=id==='top'||id==='main'?0:cinematic?(timeline.destinations[target.id]??masterAtContent(timeline,content)):content;
   return {target,coordinate:Math.min(document.documentElement.scrollHeight-innerHeight,coordinate)};
  };
  const focusArrival=(target:HTMLElement)=>{
   restoring=true;
   (target.matches('h1,h2,h3')?target:target.querySelector<HTMLElement>('h1,h2,h3'))?.focus({preventScroll:true});
   restoring=false;
  };
  const durationFor=(distance:number)=>Math.min(3600,650+Math.sqrt(Math.abs(distance)/Math.max(1,innerHeight))*700);
  const navigateToSection=(id:string,focus=false,animate=false)=>{
   cancelNavigation();const resolved=destinationFor(id);if(!resolved)return;
   if(!animate||reducedMotion||Math.abs(resolved.coordinate-scrollY)<2){
    window.scrollTo({top:resolved.coordinate,behavior:'instant'});publish();if(focus)focusArrival(resolved.target);return;
   }
   journey={id,focus,origin:scrollY,start:performance.now(),duration:durationFor(resolved.coordinate-scrollY)};
   root.dataset.navigating=id;
   const tick=(now:number)=>{
    if(!journey||disposed)return;
    // Re-resolve against the current measured map on every frame. A refresh
    // re-bases the journey at its current position instead of seeking old data.
    const destination=destinationFor(journey.id);if(!destination){cancelNavigation();return;}
    const t=Math.min(1,(now-journey.start)/journey.duration);
    // A short acceleration/deceleration with a steady centre, rather than an
    // ease applied independently to the scene, content, or individual phases.
    const edge=.2,velocity=1/(1-edge);
    const eased=t<edge?velocity*t*t/(2*edge):t>1-edge?1-velocity*(1-t)**2/(2*edge):velocity*(t-edge/2);
    window.scrollTo({top:journey.origin+(destination.coordinate-journey.origin)*eased,behavior:'instant'});publish();
    if(t<1)navigationFrame=requestAnimationFrame(tick);
    else {const focus=journey.focus;cancelNavigation();if(focus)focusArrival(destination.target);persist();}
   };
   navigationFrame=requestAnimationFrame(tick);
  };
  navigationService.current=id=>navigateToSection(id,true,true);
  const measure=()=>{
   if(disposed)return;
   const previousPhase=timeline.phases.find(p=>p.id===state.phase);
   const heldFraction=previousPhase?.id.startsWith('reset')?(state.master-previousPhase.start)/(previousPhase.end-previousPhase.start):null;
   const retainedAnchor=first?retainedPosition?.anchor:readingPosition.current?.anchor;
   const previousCinematic=first?(retainedPosition?.cinematic??false):cinematic,oldContent=first?(retainedPosition?.offset??scrollY):state.contentOffset;
   cinematic=!reducedMotion&&!failed&&innerWidth>900&&innerHeight>620;
   root.dataset.cinematic=String(cinematic);
   main.style.removeProperty('transform');
   if(layoutMode!==cinematic){layoutMode=cinematic;measured=false;scheduled=requestAnimationFrame(measure);return;}
   // Root mode changes can precede the browser's computed section layout.
   // Do not restore a saved master against stale normal-flow dimensions.
   const contact=document.getElementById('contact');
   if(cinematic&&(getComputedStyle(main).position!=='fixed'||(contact&&parseFloat(getComputedStyle(contact).paddingTop)>1))){scheduled=requestAnimationFrame(measure);return;}
   readingInset=(document.querySelector('.site-header')?.getBoundingClientRect().bottom??88)+22;
   root.style.setProperty('--reading-inset',`${readingInset}px`);
   const sections:SectionMeasurements={};
   main.querySelectorAll<HTMLElement>('section[id],article[id],#experience-exit,#foundation-grid,#credentials,[data-motion-stage]').forEach(el=>{if(el.id){const reading=el.querySelector<HTMLElement>('.section-eyebrow')??(el.id==='experience-exit'?el.querySelector<HTMLElement>('p'):null)??el;sections[el.id]={top:elementTop(el),height:el.offsetHeight,readingTop:elementTop(reading)};}});
   timeline=createTimeline(sections,innerHeight,readingInset);
   space.style.height=cinematic?`${timeline.total+innerHeight}px`:'0px';
   // A display:none spacer can retain its old zero layout for a frame when
   // switching out of reduced motion. Restore only after native travel exists.
   if(cinematic&&space.offsetHeight<innerHeight+1){scheduled=requestAnimationFrame(measure);return;}
   measured=true;
   if(!first||retainedPosition){
    const hold=heldFraction!==null&&previousCinematic&&cinematic?timeline.phases.find(p=>p.id===state.phase):null;
    const anchor=retainedAnchor?document.getElementById(retainedAnchor.id):null;
    const content=anchor&&retainedAnchor?elementTop(anchor)-retainedAnchor.top:oldContent;
    const destination=hold?hold.start+(hold.end-hold.start)*heldFraction!:(cinematic?masterAtContent(timeline,content):content);
    window.scrollTo({top:destination,behavior:'instant'});
   }
   if(journey){journey.origin=scrollY;journey.start=performance.now();journey.duration=durationFor((destinationFor(journey.id)?.coordinate??scrollY)-scrollY);}
   if(process.env.NODE_ENV==='development')window.__kinetic={getState:()=>state,timeline,seek:(pixels)=>{window.scrollTo({top:pixels,behavior:'instant'});publish();},navigate:(id)=>navigateToSection(id)};
   if(first&&savedPosition){window.scrollTo({top:cinematic?(savedPosition.cinematic?savedPosition.master:masterAtContent(timeline,savedPosition.contentOffset)):savedPosition.contentOffset,behavior:'instant'});publish();}
   else if(first&&!retainedPosition&&location.hash){navigateToSection(decodeURIComponent(location.hash.slice(1)));}else publish();
   first=false;root.dataset.restorationApplied='true';persist();
  };
  const refresh=()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(measure);};
  const onHash=()=>{
   cancelNavigation();
   let saved:{master:number;contentOffset:number;cinematic:boolean}|null=null;
   try{saved=JSON.parse(sessionStorage.getItem(positionKey())||'null');}catch{}
   if(saved){scrollTo({top:cinematic?(saved.cinematic?saved.master:masterAtContent(timeline,saved.contentOffset)):saved.contentOffset,behavior:'instant'});publish();}
   else navigateToSection(decodeURIComponent(location.hash.slice(1)||'top'));
  };
  const onClick=(event:MouseEvent)=>{
   const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
   if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||anchor.download||anchor.target&&anchor.target!=='_self')return;
   const hash=anchor.getAttribute('href')!;if(!document.getElementById(hash.slice(1)))return;
   event.preventDefault();persist();if(location.hash!==hash)history.pushState(null,'',hash);navigateToSection(decodeURIComponent(hash.slice(1)),true,true);
  };
  const onFocus=(event:FocusEvent)=>{
   if(!cinematic||restoring)return;
   cancelNavigation();const el=event.target as HTMLElement;
   if(!main.contains(el))return;const bounds=el.getBoundingClientRect();
   if(bounds.top<readingInset||bounds.bottom>innerHeight-30){const destination=masterAtContent(timeline,Math.max(0,elementTop(el)-innerHeight*.40));restoring=true;scrollTo({top:destination,behavior:'instant'});publish();restoring=false;}
  };
  const onKey=(event:KeyboardEvent)=>{if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||(event.target as HTMLElement).isContentEditable)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key))cancelNavigation();if(!cinematic)return;if(event.key==='Home'||event.key==='End'){event.preventDefault();window.scrollTo({top:event.key==='Home'?0:timeline.total,behavior:'instant'});publish();}};
  const onPointer=(event:PointerEvent)=>{if(event.pointerType==='touch'||event.target===document.documentElement||event.clientX>=document.documentElement.clientWidth)cancelNavigation();};
  const onFailure=()=>{cancelNavigation();failed=true;root.dataset.sceneFailed='true';measure();};
  const onVisible=()=>{if(!document.hidden)refresh();};
  document.fonts.ready.then(()=>{if(!disposed)measure();});
  const observer=new ResizeObserver(refresh);observer.observe(main);const header=document.querySelector('.site-header');if(header)observer.observe(header);
  window.addEventListener('resize',refresh);window.addEventListener('scroll',publish,{passive:true});window.addEventListener('pageshow',refresh);window.addEventListener('pagehide',persist);
  window.addEventListener('hashchange',onHash);window.addEventListener('popstate',onHash);window.addEventListener('kineticfailure',onFailure);
  window.addEventListener('wheel',cancelNavigation,{passive:true});window.addEventListener('touchstart',cancelNavigation,{passive:true});document.addEventListener('pointerdown',onPointer);
  document.addEventListener('click',onClick);document.addEventListener('focusin',onFocus);document.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',onVisible);
  return()=>{disposed=true;cancelNavigation();navigationService.current=()=>{};history.scrollRestoration=previousRestoration;root.style.scrollBehavior=previousScrollBehavior;window.removeEventListener('wheel',cancelNavigation);window.removeEventListener('touchstart',cancelNavigation);document.removeEventListener('pointerdown',onPointer);observer.disconnect();cancelAnimationFrame(scheduled);window.removeEventListener('resize',refresh);window.removeEventListener('scroll',publish);window.removeEventListener('pageshow',refresh);window.removeEventListener('pagehide',persist);window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onHash);window.removeEventListener('kineticfailure',onFailure);document.removeEventListener('click',onClick);document.removeEventListener('focusin',onFocus);document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisible);main.style.removeProperty('transform');root.style.removeProperty('--page-fg');delete root.dataset.cinematic;delete root.dataset.motionReady;delete window.__kinetic;};
 },[initialized,reducedMotion]);
 const value=useMemo(()=>({preference,reducedMotion,motionEnabled:initialized&&!reducedMotion,setPreference,toggleMotion:()=>setPreference(reducedMotion?'full':'reduced'),navigateToSection:(id:string)=>navigationService.current(id)}),[preference,reducedMotion,initialized]);
 return <MotionContext.Provider value={value}>{children}<div className="scroll-space" data-scroll-space="" aria-hidden="true" /></MotionContext.Provider>;
}
