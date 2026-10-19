import { POSES } from '../../components/scene/scene-config';
import type { ScenePose } from './timeline';

type Listener = (pose: ScenePose) => void;
let current = POSES.opening;
const listeners = new Set<Listener>();
export const motionStore = {
  get: () => current,
  publish(pose: ScenePose) { current = pose; listeners.forEach(listener => listener(pose)); },
  subscribe(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
