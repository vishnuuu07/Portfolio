'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useMotion } from './MotionProvider';
import styles from './Scene.module.css';
const PortfolioScene=dynamic(()=>import('./PortfolioScene'),{ssr:false});
class SceneBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?null:this.props.children;}
}
export default function SceneLoader(){
 const {reducedMotion}=useMotion();const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[inspect,setInspect]=useState(false);
 const onReady=useCallback(()=>setReady(true),[]);
 const onFailure=useCallback(()=>{setFailed(true);setReady(false);window.dispatchEvent(new Event('kineticfailure'));},[]);
 useEffect(()=>{if(process.env.NODE_ENV==='development'&&new URLSearchParams(location.search).has('sceneDebug')){const frame=requestAnimationFrame(()=>setInspect(true));return()=>cancelAnimationFrame(frame);}},[]);
 return <div className={styles.stage} data-portfolio-stage="" data-ready={ready&&!failed&&!reducedMotion?'true':'false'} data-mode={failed?'fallback':reducedMotion?'reduced':'full'} aria-hidden="true">
 {inspect&&<pre id="scene-inspector" className={styles.inspector}/>}
 {!failed&&!reducedMotion&&<SceneBoundary onFailure={onFailure}><div className={styles.canvas}><PortfolioScene onReady={onReady} onFailure={onFailure}/></div></SceneBoundary>}
 </div>;
}
