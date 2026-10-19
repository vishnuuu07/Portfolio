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

export function rotation(x: number, y: number, z: number): Quat {
  return new Quaternion().setFromEuler(new Euler(x, y, z, "ZYX")).toArray() as [number, number, number, number];
}
export function beam(position: Vec3, degrees: Vec3): BeamPose {
  return { position, quaternion: rotation(...degrees.map(v => v * Math.PI / 180) as [number, number, number]) };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const vector = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((v, i) => lerp(v, b[i], t)) as unknown as Vec3;
const mixBeam = (a: BeamPose, b: BeamPose, t: number): BeamPose => ({
  position: vector(a.position, b.position, t),
  quaternion: new Quaternion(...a.quaternion).slerp(new Quaternion(...b.quaternion), t).toArray() as [number, number, number, number],
});

/** Stateless evaluator: scrubbing backward, restored hashes and resize use the same path. */
export function evaluateTimeline(anchors: readonly TimelineAnchor[], scroll: number): ScenePose {
  if (!anchors.length) throw new Error('The scene requires an authored timeline');
  if (scroll <= anchors[0].at) return { ...anchors[0].pose, progress: 0 };
  const last = anchors[anchors.length - 1];
  if (scroll >= last.at) return { ...last.pose, progress: 1 };
  let index = 0;
  while (index < anchors.length - 2 && scroll > anchors[index + 1].at) index++;
  const a = anchors[index]; const b = anchors[index + 1];
  const raw = Math.max(0, Math.min(1, (scroll - a.at) / Math.max(1, b.at - a.at)));
  const t = raw * raw * (3 - 2 * raw);
  return {
    beams: [mixBeam(a.pose.beams[0], b.pose.beams[0], t), mixBeam(a.pose.beams[1], b.pose.beams[1], t)],
    camera: vector(a.pose.camera, b.pose.camera, t), target: vector(a.pose.target, b.pose.target, t),
    keyLight: vector(a.pose.keyLight, b.pose.keyLight, t),
    darkness: lerp(a.pose.darkness, b.pose.darkness, t),
    framingX: lerp(a.pose.framingX, b.pose.framingX, t),
    chapter: raw < .5 ? a.pose.chapter : b.pose.chapter,
    scene: raw < .5 ? a.pose.scene : b.pose.scene,
    localProgress: raw,
    progress: Math.max(0, Math.min(1, scroll / Math.max(1, last.at))),
  };
}

export function stationaryPose(pose: ScenePose, opening: ScenePose): ScenePose {
  return { ...opening, chapter: pose.chapter, darkness: pose.darkness >= .5 ? 1 : 0, progress: pose.progress };
}

export type ExperienceState = ScenePose & { master: number; contentOffset: number; phase: string; act: number };
/** The native scrollbar is strictly monotone; only content has two plateaus. */
export function evaluateExperience(timeline: import('../../components/scene/scene-config').ExperienceTimeline, nativeScroll: number): ExperienceState {
 const master=Math.max(0,Math.min(timeline.total,nativeScroll));
 const phase=timeline.phases.find(p=>master<=p.end)??timeline.phases[timeline.phases.length-1];
 const t=Math.max(0,Math.min(1,(master-phase.start)/Math.max(1,phase.end-phase.start)));
 const contentOffset=phase.contentStart+(phase.contentEnd-phase.contentStart)*t;
 const pose=evaluateTimeline(timeline.anchors,master);
 let chapter='top';
 for(const [id,section] of Object.entries(timeline.sections)) if(!id.includes('experience-')&&!id.includes('approach-')&&id!=='foundation-grid'&&id!=='credentials'&&section.top<=contentOffset+240) chapter=id;
 return {...pose,chapter,master,contentOffset,phase:phase.id,act:phase.id==='opening'?0:phase.id==='reveal-1'||phase.id==='reset-1'?1:phase.id==='closing'?3:2};
}
