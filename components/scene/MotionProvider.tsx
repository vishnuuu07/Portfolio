'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Color } from 'three';
import { createTimeline, masterAtContent, POSES, type SectionMeasurements, type ExperienceTimeline } from './scene-config';
import { evaluateExperience, stationaryPose, type ExperienceState } from '../../lib/motion/timeline';
import { motionStore } from '../../lib/motion/store';

type Preference='system'|'full'|'reduced';
type MotionContextValue={reducedMotion:boolean;motionEnabled:boolean;preference:Preference;setPreference:(value:Preference)=>void;toggleMotion:()=>void};
const MotionContext=createContext<MotionContextValue>({reducedMotion:true,motionEnabled:false,preference:'system',setPreference:()=>{},toggleMotion:()=>{}});
export const useMotion=()=>useContext(MotionContext);
declare global { interface Window { __kinetic?:{getState:()=>ExperienceState;timeline:ExperienceTimeline;seek:(pixels:number)=>void;navigate:(id:string)=>void}; } }

export function MotionProvider({children}:{children:ReactNode}){
 const readingPosition=useRef<{offset:number;cinematic:boolean}|null>(null);
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
  let disposed=false,scheduled=0,cinematic=false,failed=root.dataset.sceneFailed==='true',first=true,restoring=false;
  let timeline=createTimeline({},innerHeight),state=evaluateExperience(timeline,scrollY);
  const positionKey=()=>`kinetic-position:${location.pathname}${location.search}${location.hash}`;
  let savedPosition:{master:number;contentOffset:number;cinematic:boolean}|null=null;
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(root.dataset.restorationApplied!=='true'&&(navigation?.type==='reload'||navigation?.type==='back_forward')) {
   try{savedPosition=JSON.parse(sessionStorage.getItem(positionKey())||'null');}catch{}
  }
  const persist=()=>{try{sessionStorage.setItem(positionKey(),JSON.stringify({master:scrollY,contentOffset:state.contentOffset,cinematic}));}catch{}};
  const light=new Color('#f8eee2'),dark=new Color('#260b14'),mixed=new Color();
  root.dataset.motion=reducedMotion?'reduced':'full';
  const elementTop=(el:HTMLElement)=>el.getBoundingClientRect().top-main.getBoundingClientRect().top;
  const publish=()=>{
   if(disposed||document.hidden)return;
   state=evaluateExperience(timeline,cinematic?scrollY:masterAtContent(timeline,scrollY));
   if(cinematic)main.style.transform=`translate3d(0,${-state.contentOffset}px,0)`;
   else main.style.removeProperty('transform');
   const pose=cinematic?state:stationaryPose({...state,darkness:0},POSES.opening);
   root.dataset.theme=pose.darkness>=.72?'dark':'light';
   root.dataset.chapter=state.chapter;
   mixed.copy(light).lerp(dark,pose.darkness);
   const bg=`#${mixed.getHexString()}`;
   root.style.setProperty('--world-bg',bg);root.style.setProperty('--studio-bg',bg);root.style.setProperty('--page-bg',bg);
   const stage=document.querySelector<HTMLElement>('[data-portfolio-stage]');
   if(stage){stage.dataset.phase=state.phase;stage.dataset.contentOffset=state.contentOffset.toFixed(3);stage.dataset.master=state.master.toFixed(3);stage.dataset.darkness=pose.darkness.toFixed(3);}
   const steps=[...document.querySelectorAll<HTMLElement>('[data-motion-stage]')];let active=steps[0];
   for(const step of steps)if(step.getBoundingClientRect().top<innerHeight*.58)active=step;
   for(const step of steps)step.dataset.active=step===active?'true':'false';
   readingPosition.current={offset:state.contentOffset,cinematic};
   if(!first)persist();
   root.dataset.motionReady='true';
   motionStore.publish(pose);
   window.dispatchEvent(new Event('kineticupdate'));
  };
  const navigate=(id:string,focus=false)=>{
   const target=document.getElementById(id==='main'?'top':id);if(!target)return;
   const content=Math.max(0,elementTop(target)-innerHeight*.13);
   const destination=id==='top'||id==='main'?0:cinematic?masterAtContent(timeline,content):content;
   restoring=true;window.scrollTo({top:destination,behavior:'instant'});publish();
   if(focus)(target.matches('h1,h2,h3')?target:target.querySelector<HTMLElement>('h1,h2,h3'))?.focus({preventScroll:true});
   restoring=false;
  };
  const measure=()=>{
   if(disposed)return;
   const previousCinematic=first?(retainedPosition?.cinematic??false):cinematic,oldContent=first?(retainedPosition?.offset??scrollY):state.contentOffset;
   cinematic=!reducedMotion&&!failed&&innerWidth>900&&innerHeight>620;
   root.dataset.cinematic=String(cinematic);
   main.style.removeProperty('transform');
   const sections:SectionMeasurements={};
   main.querySelectorAll<HTMLElement>('section[id],article[id],#experience-exit,#foundation-grid,#credentials,[data-motion-stage]').forEach(el=>{if(el.id)sections[el.id]={top:elementTop(el),height:el.offsetHeight};});
   timeline=createTimeline(sections,innerHeight);
   space.style.height=cinematic?`${timeline.total+innerHeight}px`:'0px';
   if((!first||retainedPosition)&&previousCinematic!==cinematic)window.scrollTo({top:cinematic?masterAtContent(timeline,oldContent):oldContent,behavior:'instant'});
   if(process.env.NODE_ENV==='development')window.__kinetic={getState:()=>state,timeline,seek:(pixels)=>{window.scrollTo({top:pixels,behavior:'instant'});publish();},navigate};
   if(first&&savedPosition){window.scrollTo({top:cinematic?(savedPosition.cinematic?savedPosition.master:masterAtContent(timeline,savedPosition.contentOffset)):savedPosition.contentOffset,behavior:'instant'});publish();}
   else if(first&&!retainedPosition&&location.hash){navigate(decodeURIComponent(location.hash.slice(1)));}else publish();
   first=false;root.dataset.restorationApplied='true';persist();
  };
  const refresh=()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(measure);};
  const onHash=()=>{
   let saved:{master:number;contentOffset:number;cinematic:boolean}|null=null;
   try{saved=JSON.parse(sessionStorage.getItem(positionKey())||'null');}catch{}
   if(saved){scrollTo({top:cinematic?(saved.cinematic?saved.master:masterAtContent(timeline,saved.contentOffset)):saved.contentOffset,behavior:'instant'});publish();}
   else navigate(decodeURIComponent(location.hash.slice(1)||'top'));
  };
  const onClick=(event:MouseEvent)=>{
   const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
   if(!anchor||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const hash=anchor.getAttribute('href')!;if(!document.getElementById(hash.slice(1)))return;
   event.preventDefault();persist();if(location.hash!==hash)history.pushState(null,'',hash);navigate(hash.slice(1),true);
  };
  const onFocus=(event:FocusEvent)=>{
   if(!cinematic||restoring)return;const el=event.target as HTMLElement;
   if(!main.contains(el))return;const bounds=el.getBoundingClientRect();
   if(bounds.top<100||bounds.bottom>innerHeight-30){const destination=masterAtContent(timeline,Math.max(0,elementTop(el)-innerHeight*.40));restoring=true;scrollTo({top:destination,behavior:'instant'});publish();restoring=false;}
  };
  const onKey=(event:KeyboardEvent)=>{if(!cinematic||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;if(event.key==='Home'||event.key==='End'){event.preventDefault();window.scrollTo({top:event.key==='Home'?0:timeline.total,behavior:'instant'});publish();}};
  const onFailure=()=>{failed=true;root.dataset.sceneFailed='true';measure();};
  const onVisible=()=>{if(!document.hidden)refresh();};
  document.fonts.ready.then(()=>{if(!disposed)measure();});
  const observer=new ResizeObserver(refresh);observer.observe(main);
  window.addEventListener('resize',refresh);window.addEventListener('scroll',publish,{passive:true});window.addEventListener('pageshow',refresh);window.addEventListener('pagehide',persist);
  window.addEventListener('hashchange',onHash);window.addEventListener('popstate',onHash);window.addEventListener('kineticfailure',onFailure);
  document.addEventListener('click',onClick);document.addEventListener('focusin',onFocus);document.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',onVisible);
  return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(scheduled);window.removeEventListener('resize',refresh);window.removeEventListener('scroll',publish);window.removeEventListener('pageshow',refresh);window.removeEventListener('pagehide',persist);window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onHash);window.removeEventListener('kineticfailure',onFailure);document.removeEventListener('click',onClick);document.removeEventListener('focusin',onFocus);document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisible);main.style.removeProperty('transform');delete root.dataset.cinematic;delete root.dataset.motionReady;delete window.__kinetic;};
 },[initialized,reducedMotion]);
 const value=useMemo(()=>({preference,reducedMotion,motionEnabled:initialized&&!reducedMotion,setPreference,toggleMotion:()=>setPreference(reducedMotion?'full':'reduced')}),[preference,reducedMotion,initialized]);
 return <MotionContext.Provider value={value}>{children}<div className="scroll-space" data-scroll-space="" aria-hidden="true" /></MotionContext.Provider>;
}
