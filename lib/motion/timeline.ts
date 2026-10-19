import { Euler, Quaternion } from 'three';

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];
export type BeamPose = { position: Vec3; quaternion: Quat };
export type ScenePose = {
  beams: readonly [BeamPose, BeamPose]; camera: Vec3; target: Vec3;
  darkness: number; chapter: string; progress: number; keyLight: Vec3;
  framingX: number;
  scene: string;
  localProgress: number;
};
export type TimelineAnchor = { at: number; pose: ScenePose };
export const BEAM_DIMENSIONS = [1, 6.5, 1] as const;
export const BEAM_BEVEL = .038;

export function rotation(x: number, y: number, z: number): Quat {
  return new Quaternion().setFromEuler(new Euler(x, y, z, "ZYX")).toArray() as [number, number, number, number];
}
export function beam(position: Vec3, degrees: Vec3): BeamPose {
  return { position, quaternion: rotation(...degrees.map(v => v * Math.PI / 180) as [number, number, number]) };
}
// Time-aware monotone Hermite slopes: shared velocity at keys, no repeated
// ease-to-zero or overshoot at the outer limits. A real repeated pose rests.
function curve(times: number[], values: number[], i: number, t: number): number {
 const slope=(k:number)=>{
  if(k===0)return (values[1]-values[0])/(times[1]-times[0]);
  if(k===values.length-1)return 0;
  const left=(values[k]-values[k-1])/(times[k]-times[k-1]);
  const right=(values[k+1]-values[k])/(times[k+1]-times[k]);
  if(left*right<=0)return 0;
  const a=times[k]-times[k-1],b=times[k+1]-times[k];
  return 3*(a+b)/((2*b+a)/left+(b+2*a)/right);
 };
 const h=times[i+1]-times[i],t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*values[i]+(t3-2*t2+t)*h*slope(i)+(-2*t3+3*t2)*values[i+1]+(t3-t2)*h*slope(i+1);
}
/** Stateless, C1 evaluator. Quaternion signs are unwrapped over the whole path
 * before interpolating and normalising, avoiding antipodal flips. */
export function evaluateTimeline(anchors: readonly TimelineAnchor[], scroll: number): ScenePose {
 if(!anchors.length)throw new Error('The scene requires an authored timeline');
 if(scroll<=anchors[0].at)return {...anchors[0].pose,progress:0};
 const last=anchors[anchors.length-1];
 if(scroll>=last.at)return {...last.pose,progress:1};
 let i=0;while(i<anchors.length-2&&scroll>anchors[i+1].at)i++;
 const raw=(scroll-anchors[i].at)/(anchors[i+1].at-anchors[i].at),times=anchors.map(a=>a.at);
 const sample=(get:(pose:ScenePose)=>number)=>curve(times,anchors.map(a=>get(a.pose)),i,raw);
 const vector=(get:(pose:ScenePose)=>Vec3):Vec3=>[0,1,2].map(axis=>sample(p=>get(p)[axis])) as unknown as Vec3;
 const beams=[0,1].map(index=>{
  const quaternions=anchors.map(a=>[...a.pose.beams[index].quaternion]);
  for(let k=1;k<quaternions.length;k++)if(quaternions[k].reduce((sum,v,j)=>sum+v*quaternions[k-1][j],0)<0)quaternions[k]=quaternions[k].map(v=>-v);
  const q=[0,1,2,3].map(axis=>curve(times,quaternions.map(v=>v[axis]),i,raw));
  return {position:vector(p=>p.beams[index].position),quaternion:new Quaternion(...q as [number,number,number,number]).normalize().toArray() as [number,number,number,number]};
 }) as unknown as [BeamPose,BeamPose];
 return {beams,camera:vector(p=>p.camera),target:vector(p=>p.target),keyLight:vector(p=>p.keyLight),
  darkness:sample(p=>p.darkness),framingX:sample(p=>p.framingX),chapter:anchors[i].pose.chapter,
  scene:anchors[i].pose.scene,localProgress:raw,progress:scroll/last.at};
}

export function phaseContent(phase:import('../../components/scene/scene-config').Phase,master:number):number {
 const length=phase.end-phase.start,travel=phase.contentEnd-phase.contentStart;
 if(!travel)return phase.contentStart;
 const x=Math.max(0,Math.min(length,master-phase.start));
 const entry=phase.id==='reveal-2'||phase.id==='closing'?Math.min(110,length*.12):0;
 const exit=phase.id==='reveal-1'||phase.id==='reveal-2'?Math.min(110,length*.12):0;
 const distance=x<entry?x*x/(2*entry):exit&&x>length-exit?length-entry/2-exit/2-(length-x)**2/(2*exit):x-entry/2;
 return phase.contentStart+travel*distance/(length-entry/2-exit/2);
}

export function stationaryPose(pose: ScenePose, opening: ScenePose): ScenePose {
  return { ...opening, chapter: pose.chapter, darkness: pose.darkness >= .5 ? 1 : 0, progress: pose.progress };
}

export type ExperienceState = ScenePose & { master: number; contentOffset: number; phase: string; act: number };
/** The native scrollbar is strictly monotone; only content has two plateaus. */
export function evaluateExperience(timeline: import('../../components/scene/scene-config').ExperienceTimeline, nativeScroll: number): ExperienceState {
 const master=Math.max(0,Math.min(timeline.total,nativeScroll));
 const phase=timeline.phases.find(p=>master<=p.end)??timeline.phases[timeline.phases.length-1];
 const contentOffset=phaseContent(phase,master);
 const pose=evaluateTimeline(timeline.anchors,master);
 let chapter='top';
 for(const [id,section] of Object.entries(timeline.sections)) if(!id.includes('experience-')&&!id.includes('approach-')&&id!=='foundation-grid'&&id!=='credentials'&&section.top<=contentOffset+240) chapter=id;
 return {...pose,chapter,master,contentOffset,phase:phase.id,act:phase.id==='opening'?0:phase.id==='reveal-1'||phase.id==='reset-1'?1:phase.id==='closing'?3:2};
}
