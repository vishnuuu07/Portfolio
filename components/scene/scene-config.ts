import { Quaternion, Vector3 } from 'three';
import { BEAM_BEVEL, phaseContent, beam, type BeamPose, type ScenePose, type TimelineAnchor, type Vec3 } from '../../lib/motion/timeline';

// One formation root and a shared inner contact edge. No independent foot offsets.
export function joinedV(root: Vec3 = [0, 0, 0]): readonly [BeamPose, BeamPose] {
 const angle=26*Math.PI/180;
 const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),16*Math.PI/180);
 return [-1,1].map(side=>{
  const local=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),-side*(side===-1?22*Math.PI/180:angle))
   .multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),(side===-1?15:-8)*Math.PI/180));
  const support=(direction:Vector3)=>{
   const axis=direction.clone().applyQuaternion(local.clone().invert());
   return new Vector3(Math.sign(axis.x)*(.5-BEAM_BEVEL),Math.sign(axis.y)*(3.25-BEAM_BEVEL),Math.sign(axis.z)*(.5-BEAM_BEVEL))
    .applyQuaternion(local).addScaledVector(direction,BEAM_BEVEL);
  };
  const inner=support(new Vector3(-side,0,0)),bottom=support(new Vector3(0,-1,0));
  // Rounded support points meet at x=z=0, while both ground supports have y=0.
  const center=new Vector3(-inner.x,-bottom.y,-inner.z).applyQuaternion(yaw);
  // The rear arm meets the near arm along a depth edge. Their grounded
  // silhouettes overlap, so the shared junction reads as one assembly.
  if(side===1)center.add(new Vector3(-.8,0,-.82));
  return {position:center.add(new Vector3(...root)).toArray() as [number,number,number],
   quaternion:yaw.clone().multiply(local).toArray() as [number,number,number,number]};
 }) as unknown as readonly [BeamPose,BeamPose];
}
const joined=joinedV();
const make = (scene: string, chapter: string, beams: ScenePose['beams'], camera: Vec3 = [-4.8, 5.1, 15.2], darkness = 0, target: Vec3 = [0, 3.2, 0]): ScenePose => ({ beams, camera, target, darkness, chapter, scene, progress:0, localProgress:0, framingX:0, keyLight:[-1, 9, 7] });
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
// Author reading and closing compositions on the same projected artboard.
// View-offset compensation keeps the root's continuous orbit from becoming a
// second lateral correction when the final studio framing takes over.
function stagePose(scene:string,chapter:string,camera:Vec3,target:Vec3,framingX:number,a:readonly[number,number,number,Vec3],b:readonly[number,number,number,Vec3]):ScenePose{
 const placed=(pose:typeof a)=>framed(camera,target,pose[0]-framingX,pose[1],pose[2],pose[3]);
 return {...make(scene,chapter,[placed(a),placed(b)],camera,0,target),framingX,keyLight:[8,9,5]};
}
export const POSES={
 opening:{...make('opening / joined V','top',joined,[-6.5,5.8,17],0,[0,2.7,0]),framingX:.25,keyLight:[8,9,5] as Vec3},
 separated:{...make('reveal 1 / feet separate','about',[beam([-2.5,3.7,.7],[0,-48,26]),beam([2.3,3.7,-.5],[0,0,-26])],[-6,6.2,18]),framingX:.18,keyLight:[8,9,5] as Vec3},
 aperture:compose('reveal 1 / introduction frame','about',[.8,6.9,14.5],[.38,.12,-.8,[8,-20,55]],[.87,.65,1.2,[5,2,-24]]),
 enterprise:compose('reveal 1 / employer entrance','experience',[2.8,7.3,14.5],[.34,.10,-1.1,[8,-15,63]],[.87,.66,1.4,[5,-3,-28]],1),
 applications:compose('reveal 1 / applications','experience',[3.5,7.7,14.2],[.29,.10,-1.3,[10,-10,72]],[.90,.68,1.7,[8,0,-35]],1),
 integrations:compose('reveal 1 / integrations','experience',[4.3,8.2,14],[.32,.12,-.5,[13,-2,82]],[.89,.64,.8,[12,7,-46]],1),
 production:compose('reveal 1 / production','experience',[5.2,8.9,13.8],[.37,.15,.4,[16,7,94]],[.88,.57,-.3,[16,13,-58]],1),
 delivery:compose('reveal 1 / delivery','experience',[5.8,9.4,14.2],[.43,.19,1,[18,14,106]],[.86,.49,-1,[20,19,-70]],1),
 outerA:compose('reveal 1 / terminal aperture','experience',[6.2,9.8,14.7],[.48,.22,1.2,[20,20,116]],[.85,.43,-1.5,[24,23,-80]],1),
 gather:compose('reset 1 / gather','experience',[4.6,10,18],[.50,.23,-1,[16,8,72]],[.82,.63,1.3,[16,8,-73]],.52),
 parallel:compose('reset 1 / oblique parallel','experience',[1.7,11.2,18.8],[.73,.32,-1.2,[22,15,60]],[.81,.68,1.4,[22,15,-120]]),
 research:compose('reveal 2 / research frame','research',[4.6,11.4,15.4],[.30,.11,-1.3,[22,15,72]],[.88,.72,1.3,[22,15,-27]]),
 approach:stagePose('reveal 2 / approach entrance','approach',[1.9,10.3,15.8],[0,6,0],0,[.42,.16,-1.5,[20,12,76]],[.89,.66,1.8,[20,12,-10]]),
 explore:stagePose('reveal 2 / explore','approach',[1.1,9.8,16.2],[0,5.8,0],.025,[.49,.20,-1.4,[17,8,80]],[.90,.63,1.8,[17,8,10]]),
 structure:stagePose('reveal 2 / structure','approach',[.1,9.1,16.8],[0,5.45,0],.05,[.55,.25,-1.3,[14,4,82]],[.90,.62,1.8,[14,4,30]]),
 direct:stagePose('reveal 2 / direct','approach',[-1,8.4,17.3],[0,5,0],.08,[.60,.30,-1.2,[11,8,82]],[.90,.63,1.8,[11,4,48]]),
 clearance:stagePose('reveal 2 / counterbalance','approach',[-2.4,7.8,17.8],[0,4.5,0],.12,[.64,.35,-1.1,[8,15,80]],[.85,.65,1.8,[8,2,68]]),
 crossing:stagePose('reveal 2 / freelance counterbalance','freelance',[-4.3,6.6,17.6],[0,3.6,0],.20,[.67,.40,-1,[5,22,79]],[.83,.67,1.8,[5,0,82]]),
 outerB:stagePose('reveal 2 / suspended diagonals','freelance',[-5.5,6,17.3],[0,3,0],.24,[.685,.435,-.95,[3,26,79]],[.82,.66,1.8,[2,2,86]]),
 retreat:stagePose('reveal 2 / foundations counterbalance','foundations',[-6.1,5.9,17.1],[0,2.8,0],.25,[.69,.45,-.9,[2,28,78]],[.815,.65,1.8,[0,4,88]]),
 reassembly:stagePose('reveal 2 / poised separate','foundations',[-6.5,5.8,17],[0,2.7,0],.25,[.69,.46,-.88,[2,29,77]],[.815,.65,1.84,[-2,6,88]]),
 preJoin:stagePose('reset 2 / poised reorientation','foundations',[-6.5,5.8,17],[0,2.7,0],.25,[.685,.46,-.88,[3,29,70]],[.81,.64,1.84,[-3,7,84]]),
 closingArc:stagePose('closing / upward return arc','contact',[-6.5,5.8,17],[0,2.7,0],.25,[.684,.440,-.65,[4,29,58]],[.80,.50,1.84,[-4,7,55]]),
 convergence:stagePose('closing / angular convergence','contact',[-6.5,5.8,17],[0,2.7,0],.25,[.683,.420,-.5,[5,29,44]],[.785,.415,1.84,[-5,7,19]]),
 settling:stagePose('closing / grounded alignment','contact',[-6.5,5.8,17],[0,2.7,0],.25,[.653,.448,-.88,[6,29.5,32]],[.772,.419,1.84,[-6,6.5,-7]]),
 contact:{...make('closing / resolved V','contact',joined,[-6.5,5.8,17],0,[0,2.7,0]),framingX:.25,keyLight:[8,9,5] as Vec3},
};
export type SectionMeasurements=Record<string,{top:number;height:number;readingTop?:number}>;
export type Phase={id:'opening'|'reveal-1'|'reset-1'|'reveal-2'|'reset-2'|'closing';start:number;end:number;contentStart:number;contentEnd:number};
export type ExperienceTimeline={anchors:TimelineAnchor[];phases:Phase[];total:number;destinations:Record<string,number>;sections:SectionMeasurements;readingInset:number};
export function masterAtContent(timeline:ExperienceTimeline,offset:number){
 const content=Math.max(0,offset);
 const phase=timeline.phases.find(p=>p.contentEnd>content&&p.contentEnd>p.contentStart)??timeline.phases[timeline.phases.length-1];
 let low=phase.start,high=phase.end;
 for(let i=0;i<32;i++){const mid=(low+high)/2;if(phaseContent(phase,mid)<content)low=mid;else high=mid;}
 return Math.min(timeline.total,(low+high)/2);
}
/** The last reading hold is a measured complete block, with contact still
 * outside the stage. Larger viewports retain education and credentials together. */
export function foundationsHold(sections:SectionMeasurements,vh:number,readingInset:number){
 const credentials=sections.credentials??sections['foundation-grid']??sections.foundations;
 const grid=sections['foundation-grid']??credentials;
 if(!credentials||!grid)return vh*11-readingInset;
 const usable=vh-readingInset-32;
 const block=grid.height<=usable?grid:credentials;
 const ideal=block.top-readingInset;
 const contact=sections.contact?.readingTop??sections.contact?.top??Infinity;
 // Choosing an earlier offset here preserves real contact travel after reset.
 return Math.max(0,Math.min(ideal,contact-vh-28));
}
export function createTimeline(sections:SectionMeasurements,vh:number,readingInset=110):ExperienceTimeline{
 const top=(id:string,fallback:number)=>sections[id]?.top??fallback;
 const read=(id:string)=>Math.max(0,(sections[id]?.readingTop??top(id,0))-readingInset);
 const r1=Math.max(vh*2,(sections['experience-exit']?.readingTop??top('experience-exit',vh*6))-(readingInset+(vh-readingInset)*.46));
 const r2=Math.max(r1+vh,foundationsHold(sections,vh,readingInset));
 const contactStart=read('contact');
 const totalContent=Math.max(r2+1,contactStart,top('contact',vh*12)+(sections.contact?.height??vh)-vh);
 const reset1=vh*.76,reset2=vh*.42;
 const openingEnd=Math.min(vh*.25,Math.max(80,top('about',vh)-vh*.8));
 const phases:Phase[]=[
 {id:'reveal-1',start:0,end:r1,contentStart:0,contentEnd:r1},
 {id:'reset-1',start:r1,end:r1+reset1,contentStart:r1,contentEnd:r1},
 {id:'reveal-2',start:r1+reset1,end:r2+reset1,contentStart:r1,contentEnd:r2},
 {id:'reset-2',start:r2+reset1,end:r2+reset1+reset2,contentStart:r2,contentEnd:r2},
 {id:'closing',start:r2+reset1+reset2,end:totalContent+reset1+reset2,contentStart:r2,contentEnd:totalContent},
 ];
 const timeline:ExperienceTimeline={anchors:[],phases,total:totalContent+reset1+reset2,destinations:{},sections,readingInset};
 const at=(offset:number)=>masterAtContent(timeline,offset);
 const add=(coordinate:number,pose:ScenePose)=>timeline.anchors.push({at:coordinate,pose});
 const between=(a:number,b:number,fraction:number)=>a+(b-a)*fraction;
 add(0,POSES.opening);
 add(Math.max(openingEnd,top('about',vh)-vh*.30),POSES.separated);
 add(Math.max(openingEnd+1,read('about')+vh*.35),POSES.aperture);
 add(at(read('experience')),POSES.enterprise);
 for(const [id,pose] of [['experience-applications',POSES.applications],['experience-integrations',POSES.integrations],['experience-production',POSES.production],['experience-delivery',POSES.delivery]] as const){
  const fallback=between(read('experience'),r1,({ 'experience-applications':.15,'experience-integrations':.38,'experience-production':.61,'experience-delivery':.84 })[id]);
  add(at(sections[id]?read(id):fallback),pose);
 }
 add(r1,POSES.outerA);add(r1+reset1*.45,POSES.gather);add(r1+reset1,POSES.parallel);
 add(at(read('research')),POSES.research);add(at(read('approach')),POSES.approach);
 for(const [index,id,pose] of [[0,'approach-explore',POSES.explore],[1,'approach-structure',POSES.structure],[2,'approach-direct',POSES.direct],[3,'approach-verify',POSES.clearance]] as const){
  add(at(sections[id]?read(id):between(read('approach'),read('freelance'),(index+1)/5)),pose);
 }
 const freelance=read('freelance');
 add(at(freelance),POSES.crossing);
 add(at(between(freelance,r2,.28)),POSES.outerB);
 add(at(between(freelance,r2,.55)),POSES.retreat);
 const resetStart=r2+reset1;
 add(resetStart,POSES.reassembly);
 // Foundations holds a visibly separate counterbalance. The real angular
 // convergence follows the incoming contact track and rests at its landing.
 const closingStart=resetStart+reset2;
 add(closingStart,POSES.preJoin);
 const contactLanding=at(contactStart);
 add(between(closingStart,contactLanding,.24),POSES.closingArc);
 add(between(closingStart,contactLanding,.46),POSES.convergence);
 add(between(closingStart,contactLanding,.73),POSES.settling);
 add(contactLanding,POSES.contact);
 if(timeline.total-contactLanding>.01)add(timeline.total,POSES.contact);
 timeline.anchors.sort((a,b)=>a.at-b.at);
 Object.keys(sections).forEach(id=>{timeline.destinations[id]=id==='top'?0:at(read(id));});
 return timeline;
}
