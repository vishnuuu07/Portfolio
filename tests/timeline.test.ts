import assert from 'node:assert/strict';
import test from 'node:test';
import { Matrix3, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { createTimeline, foundationsHold, masterAtContent, POSES, type SectionMeasurements } from '../components/scene/scene-config';
import { BEAM_DIMENSIONS, evaluateExperience, stationaryPose } from '../lib/motion/timeline';

const sections: SectionMeasurements = {
  top: { top: 0, height: 900 }, about: { top: 1000, height: 1100 }, experience: { top: 2200, height: 4500 },
  'experience-applications': { top: 3100, height: 900 }, 'experience-integrations': { top: 4000, height: 900 },
  'experience-production': { top: 4900, height: 900 }, 'experience-delivery': { top: 5800, height: 900 },
  'experience-exit': {top:6500,height:400},
  research: { top: 6800, height: 1000 }, approach: { top: 7900, height: 1300 },
  'approach-explore': { top: 8200, height: 300 }, 'approach-structure': { top: 8500, height: 300 },
  'approach-direct': { top: 8800, height: 300 }, 'approach-verify': { top: 9100, height: 300 },
  freelance: { top: 9400, height: 900 }, foundations: { top: 10400, height: 1100 },
  'foundation-grid': {top:10700,height:730},credentials:{top:11050,height:380},contact: { top: 11600, height: 900 },
};
const timeline=createTimeline(sections,900,110);
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
const state=(y:number)=>evaluateExperience(timeline,y);

test('canonical poses clamp, share geometry, and respond within 40 CSS pixels',()=>{
 assert.deepEqual(state(-100).beams,POSES.opening.beams);
 assert.deepEqual(state(timeline.total+100).beams,POSES.contact.beams);
 assert.deepEqual(POSES.opening.beams,POSES.contact.beams);
 assert.deepEqual(BEAM_DIMENSIONS,[1,6.5,1]);
 assert.ok(distance(state(0).beams[0].position,state(40).beams[0].position)>.03);
});

test('native/content mapping has exactly two holds and no trailing dead interval',()=>{
 assert.equal(timeline.phases.filter(p=>p.contentStart===p.contentEnd).length,2);
 for(const phase of timeline.phases.filter(p=>p.id.startsWith('reset'))){
  for(const t of [0,.1,.5,.9,1])assert.ok(Math.abs(state(phase.start+(phase.end-phase.start)*t).contentOffset-phase.contentStart)<1e-7);
  const a=state(phase.start),b=state(phase.end);
  assert.ok(distance(a.beams[0].position,b.beams[0].position)>.1||new Quaternion(...a.beams[0].quaternion).angleTo(new Quaternion(...b.beams[0].quaternion))>.05);
 }
 assert.ok(state(timeline.total).contentOffset>state(timeline.total-40).contentOffset);
 assert.notDeepEqual(state(timeline.destinations.contact).beams,state(timeline.destinations.contact-40).beams);
 const reset2=timeline.phases.find(p=>p.id==='reset-2')!;
 assert.notDeepEqual(state(reset2.end).beams,state(timeline.total).beams);
 for(let content=1;content<state(timeline.total).contentOffset;content+=73){
  assert.ok(Math.abs(state(masterAtContent(timeline,content)).contentOffset-content)<.0001);
 }
});

test('path has matching spatial, angular and content velocity at every join',()=>{
 const vector=(y:number)=>{const s=state(y);return [...s.camera,...s.target,...s.keyLight,s.darkness,s.framingX,s.contentOffset,...s.beams.flatMap(b=>[...b.position,...b.quaternion])];};
 for(const at of [...timeline.anchors.slice(1,-1).map(a=>a.at),...timeline.phases.slice(1).map(p=>p.start)]){
  const epsilon=.01,a=vector(at-epsilon),b=vector(at),c=vector(at+epsilon);
  assert.ok(distance(a,c)<.04,`position discontinuity at ${at}`);
  const left=b.map((v,i)=>(v-a[i])/epsilon),right=c.map((v,i)=>(v-b[i])/epsilon);
  assert.ok(distance(left,right)<.002,`velocity discontinuity at ${at}`);
 }
});

test('seeking is reversible, finite and normalized across the full path',()=>{
 const coordinates=Array.from({length:501},(_,i)=>timeline.total*i/500);
 const forward=coordinates.map(state);
 coordinates.reverse().forEach((y,i)=>{
  const s=state(y);assert.deepEqual(s,forward[forward.length-1-i]);
  for(const beam of s.beams){assert.ok(Math.abs(Math.hypot(...beam.quaternion)-1)<1e-10);assert.ok(beam.position.every(Number.isFinite));}
  assert.ok(s.camera.every(Number.isFinite));assert.ok(distance(s.camera,s.target)>10);
 });
});

test('enterprise stays wine, research returns to daylight, and reduced motion is stationary',()=>{
 for(const id of ['experience-applications','experience-integrations','experience-production','experience-delivery'])assert.equal(state(timeline.destinations[id]).darkness,1);
 for(const id of ['research','approach','freelance','foundations','contact'])assert.equal(state(timeline.destinations[id]).darkness,0,id);
 for(const y of [0,4000,7000,timeline.total]){
  const s=stationaryPose(state(y),POSES.opening);assert.deepEqual(s.beams,POSES.opening.beams);assert.deepEqual(s.camera,POSES.opening.camera);
 }
});

test('contact offset and range derive from measured reading inset and actual bottom',()=>{
 const contact={top:12000,height:790,readingTop:12000};
 const t=createTimeline({...sections,contact},900,110);
 assert.equal(evaluateExperience(t,t.total).contentOffset,11890);
 assert.ok(Math.abs(t.destinations.contact-t.total)<.0001);
 const short=createTimeline({...sections,contact:{...contact,height:1100}},720,110);
 assert.equal(evaluateExperience(short,short.total).contentOffset,12380);
});

test('solid cores stay separated during the depth exchange and final assembly',()=>{
 const solid=(pose:ReturnType<typeof state>['beams'][number])=>new OBB(new Vector3(...pose.position),new Vector3(.475,3.225,.475),new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(new Quaternion(...pose.quaternion))));
 for(let i=0;i<=1000;i++){
  const s=state(timeline.total*i/1000);
  assert.equal(solid(s.beams[0]).intersectsOBB(solid(s.beams[1])),false,`${s.phase} at ${s.master}`);
 }
});

// Project all rigid beam corners; camera orbit and orientation count as movement,
// rather than considering only the distance between world-space centres.
const projected=(pose:ReturnType<typeof state>)=>{
 const camera=new PerspectiveCamera(31,1.6,.2,140);
 camera.position.fromArray(pose.camera);camera.lookAt(new Vector3(...pose.target));
 camera.setViewOffset(1440,900,-1440*pose.framingX,0,1440,900);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 return pose.beams.flatMap(beam=>[-.5,.5].flatMap(x=>[-3.25,3.25].flatMap(y=>[-.5,.5].flatMap(z=>{
  const point=new Vector3(x,y,z).applyQuaternion(new Quaternion(...beam.quaternion)).add(new Vector3(...beam.position)).project(camera);
  return [point.x,point.y];
 }))));
};
test('equal native scroll advances projected geometry through every enterprise and approach beat',()=>{
 for(const id of ['experience-applications','experience-integrations','experience-production','experience-delivery','approach-explore','approach-structure','approach-direct','approach-verify']){
  const start=timeline.destinations[id],samples=[];
  for(let y=start;y<start+450;y+=125)samples.push(distance(projected(state(y)),projected(state(y+125)))/Math.sqrt(32));
  assert.ok(Math.min(...samples)>.003,`${id} contains parked geometry: ${samples}`);
  assert.ok(Math.max(...samples)<.30,`${id} concentrates travel: ${samples}`);
 }
});

test('final hold keeps a complete measured block and contact below the stage at different heights',()=>{
 for(const vh of [720,900,1200]){
  const hold=foundationsHold(sections,vh,110);
  const block=sections['foundation-grid'].height<=vh-110-32?sections['foundation-grid']:sections.credentials;
  assert.ok(block.top-hold>=110);
  assert.ok(block.top+block.height-hold<=vh-20);
  assert.ok(sections.contact.top-hold>vh);
  const t=createTimeline(sections,vh,110),reset=t.phases.find(p=>p.id==='reset-2')!;
  for(const fraction of [0,.25,.5,.75,1])assert.equal(evaluateExperience(t,reset.start+(reset.end-reset.start)*fraction).contentOffset,hold);
  assert.notDeepEqual(evaluateExperience(t,reset.end).beams,evaluateExperience(t,t.total).beams);
  assert.ok(t.destinations.contact>=reset.end);
 }
});

test('separated counterbalance converges angularly with the contact reading landing',()=>{
 const reset=timeline.phases.find(p=>p.id==='reset-2')!,landing=timeline.destinations.contact;
 const axes=(s:ReturnType<typeof state>)=>{
  const camera=new PerspectiveCamera(31,1.6,.2,140);camera.position.fromArray(s.camera);camera.lookAt(new Vector3(...s.target));camera.updateMatrixWorld();
  return s.beams.map(beam=>{
   const a=new Vector3(0,3.25,0).applyQuaternion(new Quaternion(...beam.quaternion)).add(new Vector3(...beam.position)).project(camera);
   const b=new Vector3(0,-3.25,0).applyQuaternion(new Quaternion(...beam.quaternion)).add(new Vector3(...beam.position)).project(camera);
   return a.sub(b).normalize();
  });
 };
 for(const y of [timeline.destinations.freelance,timeline.destinations.foundations,reset.start,reset.end]){
  const directions=axes(state(y));
  assert.ok(directions[0].x*directions[1].x>0,`the ${y} reading composition must remain an openly separated counterbalance`);
 }
 const poised=state(reset.end),finished=state(landing),half=state((reset.end+landing)/2);
 assert.ok(distance(projected(poised),projected(finished))/Math.sqrt(32)>.15);
 assert.ok(distance(projected(half),projected(finished))/Math.sqrt(32)>.04);
 for(let i=0;i<2;i++)assert.ok(new Quaternion(...poised.beams[i].quaternion).angleTo(new Quaternion(...finished.beams[i].quaternion))>.5,'closing must resolve the actual orientation, not only depth');
 assert.ok(distance(projected(state(landing-40)),projected(finished))>.00001);
 assert.deepEqual(finished.beams,POSES.contact.beams);
 const directions=axes(finished);assert.ok(directions[0].x*directions[1].x<0);
 assert.ok(Math.abs(finished.contentOffset-(sections.contact.top-110))<.0001);
 const tall=createTimeline({...sections,contact:{...sections.contact,height:1250}},720,110);
 assert.ok(tall.destinations.contact<tall.total);
 assert.deepEqual(evaluateExperience(tall,tall.destinations.contact).beams,evaluateExperience(tall,tall.total).beams);
});
