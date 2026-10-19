import { Vector3 } from 'three';
import { beam, type BeamPose, type ScenePose, type TimelineAnchor, type Vec3 } from '../../lib/motion/timeline';

const joined = [beam([-2.08, 3.15, .3], [0, -52, 26]), beam([1.875, 3.15, -.15], [0, 0, -26])] as const;
const make = (scene: string, chapter: string, beams: ScenePose['beams'], camera: Vec3 = [-5.8, 5.0, 12.8], darkness = 0, target: Vec3 = [0, 3.2, 0]): ScenePose => ({ beams, camera, target, darkness, chapter, scene, progress:0, localProgress:0, framingX:0, keyLight:[-1, 9, 7] });
function framed(camera: Vec3, target: Vec3, x: number, y: number, depth: number, degrees: Vec3): BeamPose {
 const eye=new Vector3(...camera), aim=new Vector3(...target), forward=aim.clone().sub(eye).normalize();
 const right=forward.clone().cross(new Vector3(0,1,0)).normalize(), up=right.clone().cross(forward).normalize();
 const distance=eye.distanceTo(aim)+depth, h=Math.tan(31*Math.PI/360)*distance;
 return beam(eye.addScaledVector(forward,distance).addScaledVector(right,(x*2-1)*h*1.6).addScaledVector(up,(1-y*2)*h).toArray() as [number,number,number],degrees);
}
function compose(scene:string, chapter:string, camera:Vec3, a:readonly[number,number,number,Vec3], b:readonly[number,number,number,Vec3], darkness=0) {
 const target:Vec3=[0,6,0];
 return {...make(scene,chapter,[framed(camera,target,...a),framed(camera,target,...b)],camera,darkness,target),keyLight:[8,13,8] as Vec3};
}
export const POSES={
 opening:{...make('opening / joined V','top',joined),framingX:.15,keyLight:[8,9,5] as Vec3},
 separated:{...make('reveal 1 / feet separate','about',[beam([-2.5,3.7,.7],[0,-48,26]),beam([2.3,3.7,-.5],[0,0,-26])],[-3.2,5.1,11.7]),framingX:.16,keyLight:[8,9,5] as Vec3},
 aperture:compose('reveal 1 / lateral aperture','about',[4.8,7.7,13.6],[.32,.10,-.5,[8,-8,72]],[.89,.62,.8,[5,-8,-30]]),
 enterprise:compose('reveal 1 / enterprise','experience',[5.8,8,13.6],[.28,.09,-.6,[8,-8,76]],[.87,.65,1,[5,-8,-32]],1),
 outerA:compose('reveal 1 / outer limits','experience',[6.2,8.4,13.2],[.25,.12,-.4,[8,-8,78]],[.90,.62,.7,[5,-8,-30]],1),
 parallel:compose('reset 1 / oblique parallel','experience',[1.7,11.2,13.8],[.61,.19,-1.5,[22,15,57]],[.84,.71,1.5,[22,15,57]]),
 research:compose('reveal 2 / depth crossing','research',[2.3,10.7,13.2],[.32,.13,-1.6,[22,15,67]],[.88,.66,1.7,[22,15,-32]]),
 exchange:compose('reveal 2 / foreground and rear exchange','approach',[1.5,10.4,13.3],[.75,.14,-4,[22,15,70]],[.78,.83,4.5,[22,15,-30]]),
 crossing:compose('reveal 2 / diagonal exchange','approach',[.5,10.2,13.3],[.84,.62,1.3,[22,15,-29]],[.30,.13,-1.5,[22,15,72]]),
 outerB:compose('reveal 2 / outer limits','foundations',[-1.6,9.5,13.5],[.88,.68,1.7,[22,15,-28]],[.28,.11,-1.7,[22,15,75]]),
 retreat:{...make('reset 2 / depth clearance','foundations',[beam([5.42,4.05,-5],[22,15,-28]),beam([-2.51,9.01,4],[22,15,75])],[-1.6,9.5,13.5],0,[0,6,0]),keyLight:[8,13,8] as Vec3},
 reassembly:{...make('reset 2 / upper return arc','foundations',[beam([5.42,4.05,-5],[22,15,-28]),beam([3.5,9.01,4],[22,15,70])],[-3.8,7.2,14],0,[0,6,0]),keyLight:[8,13,8] as Vec3},
 preJoin:{...make('reset 2 / final alignment','foundations',[beam([-2.08,3.15,-5],[0,-52,26]),beam([1.875,3.15,4],[0,0,-26])],[-6.0,5.3,13.4]),framingX:.22,keyLight:[8,9,5] as Vec3},
 contact:{...make('closing / resolved V','contact',joined,[-6.0,5.3,13.4]),framingX:.22,keyLight:[8,9,5] as Vec3},
};
export type SectionMeasurements=Record<string,{top:number;height:number}>;
export type Phase={id:'opening'|'reveal-1'|'reset-1'|'reveal-2'|'reset-2'|'closing';start:number;end:number;contentStart:number;contentEnd:number};
export type ExperienceTimeline={anchors:TimelineAnchor[];phases:Phase[];total:number;destinations:Record<string,number>;sections:SectionMeasurements};
export function masterAtContent(timeline:ExperienceTimeline,offset:number){
 let extra=0;
 for(const phase of timeline.phases) if(phase.id.startsWith('reset')&&offset>phase.contentStart) extra+=phase.end-phase.start;
 return Math.min(timeline.total,Math.max(0,offset+extra));
}
export function createTimeline(sections:SectionMeasurements,vh:number):ExperienceTimeline{
 const top=(id:string,fallback:number)=>sections[id]?.top??fallback;
 const r1=Math.max(vh*2,top('experience-exit',vh*6)-vh*.30);
 const r2=Math.max(r1+vh,top('credentials',top('foundation-grid',vh*11))-vh*.23);
 const totalContent=Math.max(r2+vh,top('contact',vh*12)+(sections.contact?.height??vh)-vh);
 const openingEnd=Math.min(vh*.2,top('about',vh)-vh*.8);
 const phases:Phase[]=[
 {id:'opening',start:0,end:openingEnd,contentStart:0,contentEnd:openingEnd},
 {id:'reveal-1',start:openingEnd,end:r1,contentStart:openingEnd,contentEnd:r1},
 {id:'reset-1',start:r1,end:r1+vh,contentStart:r1,contentEnd:r1},
 {id:'reveal-2',start:r1+vh,end:r2+vh,contentStart:r1,contentEnd:r2},
 {id:'reset-2',start:r2+vh,end:r2+vh*2,contentStart:r2,contentEnd:r2},
 {id:'closing',start:r2+vh*2,end:totalContent+vh*2,contentStart:r2,contentEnd:totalContent},
 ];
 const timeline:ExperienceTimeline={anchors:[],phases,total:totalContent+vh*2,destinations:{},sections};
 const at=(offset:number)=>masterAtContent(timeline,offset);
 const read=(id:string,line=.25)=>Math.max(0,top(id,0)-vh*line);
 const add=(at:number,pose:ScenePose)=>timeline.anchors.push({at,pose});
 add(0,POSES.opening);add(openingEnd,POSES.opening);
 add(read('about',.78),POSES.separated);add(read('about',.16),POSES.aperture);
 add(read('experience',.85),POSES.aperture);add(read('experience',.18),POSES.enterprise);
 add(r1,POSES.outerA);add(r1+vh,POSES.parallel);
 add(at(read('research',.2)),POSES.research);
 add(at(read('approach',.1)),POSES.research);
 add(at((read('approach',.1)+read('freelance',.3))*.5),POSES.exchange);add(at(read('freelance',.3)),POSES.crossing);
 add(r2+vh,POSES.outerB);add(r2+vh*1.2,POSES.retreat);add(r2+vh*1.47,POSES.reassembly);add(r2+vh*1.83,POSES.preJoin);add(r2+vh*2,POSES.contact);add(timeline.total,POSES.contact);
 timeline.anchors.sort((a,b)=>a.at-b.at);
 Object.keys(sections).forEach(id=>{timeline.destinations[id]=at(Math.max(0,sections[id].top-(id==='top'?0:vh*.13)));});
 return timeline;
}
