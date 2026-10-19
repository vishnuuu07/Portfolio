import assert from 'node:assert/strict';
import test from 'node:test';
import { Quaternion } from 'three';
import { createTimeline, POSES, type SectionMeasurements } from '../components/scene/scene-config';
import { BEAM_DIMENSIONS, evaluateTimeline, stationaryPose } from '../lib/motion/timeline';

const sections: SectionMeasurements = {
  top: { top: 0, height: 900 }, about: { top: 1000, height: 1100 }, experience: { top: 2200, height: 4500 },
  'experience-applications': { top: 3100, height: 900 }, 'experience-integrations': { top: 4000, height: 900 },
  'experience-production': { top: 4900, height: 900 }, 'experience-delivery': { top: 5800, height: 900 },
  research: { top: 6800, height: 1000 }, approach: { top: 7900, height: 1300 },
  'approach-explore': { top: 8200, height: 300 }, 'approach-structure': { top: 8500, height: 300 },
  'approach-direct': { top: 8800, height: 300 }, 'approach-verify': { top: 9100, height: 300 },
  freelance: { top: 9400, height: 900 }, foundations: { top: 10400, height: 1100 }, contact: { top: 11600, height: 900 },
};
const anchors = createTimeline(sections, 900);
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((value, i) => value - b[i]));

test('start and end clamp without depending on evaluation history', () => {
  assert.deepEqual(evaluateTimeline(anchors, -100).beams, POSES.opening.beams);
  assert.deepEqual(evaluateTimeline(anchors, 100000).beams, POSES.contact.beams);
  assert.ok(distance(POSES.contact.camera, POSES.contact.target) > distance(POSES.opening.camera, POSES.opening.target), 'closing shot pulls back');
});

test('every sampled state has two rigid normalized beam poses and finite camera', () => {
  assert.deepEqual(BEAM_DIMENSIONS, [1, 6.5, 1]);
  for (let y = 0; y <= 12500; y += 13) {
    const pose = evaluateTimeline(anchors, y);
    assert.equal(pose.beams.length, 2);
    for (const beam of pose.beams) {
      assert.ok(Math.abs(Math.hypot(...beam.quaternion) - 1) < 1e-10);
      assert.equal('scale' in beam, false, 'depth is camera perspective, never beam scaling');
      assert.ok(beam.position.every(Number.isFinite));
    }
    assert.ok(pose.camera.every(Number.isFinite));
    assert.ok(distance(pose.camera, pose.target) > 10, 'camera remains outside the beam volume');
  }
});

test('boundaries stay continuous in position, camera, light and quaternion', () => {
  for (const anchor of anchors.slice(1, -1)) {
    const before = evaluateTimeline(anchors, anchor.at - .001);
    const after = evaluateTimeline(anchors, anchor.at + .001);
    assert.ok(distance(before.camera, after.camera) < .001);
    assert.ok(Math.abs(before.darkness - after.darkness) < .001);
    assert.ok(Math.abs(before.framingX - after.framingX) < .001);
    before.beams.forEach((beam, i) => {
      assert.ok(distance(beam.position, after.beams[i].position) < .001);
      assert.ok(new Quaternion(...beam.quaternion).angleTo(new Quaternion(...after.beams[i].quaternion)) < .001);
    });
  }
});

test('orbit changes viewpoint; a visible separation precedes the foreground flight', () => {
  assert.ok(POSES.opening.camera[0] > 0 && POSES.orbit.camera[0] < 0);
  assert.ok(distance(POSES.opening.camera, POSES.orbit.camera) > 14);
  assert.ok(distance(POSES.separated.beams[0].position, POSES.separated.beams[1].position) > distance(POSES.opening.beams[0].position, POSES.opening.beams[1].position) + 1.5);
  assert.ok(POSES.flight.beams[0].position[2] > 0 && POSES.flight.beams[1].position[2] < 0);
});

test('only enterprise is sustained dark; research and all following reading chapters are bright', () => {
  for (const id of ['experience-applications', 'experience-integrations', 'experience-production', 'experience-delivery']) {
    assert.equal(evaluateTimeline(anchors, sections[id].top - 300).darkness, 1);
  }
  for (const id of ['research', 'approach', 'freelance', 'foundations', 'contact']) {
    assert.equal(evaluateTimeline(anchors, sections[id].top - 100).darkness, 0, id);
  }
  assert.equal(evaluateTimeline(anchors, sections.about.top).darkness, 0);
});

test('reverse scrubbing produces identical states, without hidden accumulated transforms', () => {
  const coordinates = Array.from({ length: 71 }, (_, i) => i * 173);
  const forward = coordinates.map(y => evaluateTimeline(anchors, y));
  coordinates.reverse().forEach((y, i) => assert.deepEqual(evaluateTimeline(anchors, y), forward[forward.length - 1 - i]));
});

test('reduced motion holds beams and camera while making the chapter theme discrete', () => {
  for (const y of [0, 900, 2400, 5000, 7000, 10000]) {
    const pose = stationaryPose(evaluateTimeline(anchors, y), POSES.opening);
    assert.deepEqual(pose.beams, POSES.opening.beams);
    assert.deepEqual(pose.camera, POSES.opening.camera);
    assert.ok(pose.darkness === 0 || pose.darkness === 1);
  }
});

test('real section reflow moves the theme gate rather than using page percent', () => {
  const expanded = Object.fromEntries(Object.entries(sections).map(([id, value]) => [id, { ...value, top: value.top + (value.top >= 6800 ? 1800 : 0) }]));
  const moved = createTimeline(expanded, 900);
  assert.equal(evaluateTimeline(moved, 6800).darkness, 1);
  assert.equal(evaluateTimeline(moved, 8500).darkness, 0);
});

test('responsive rows with equal stage tops still give finite ordered alignment intervals', () => {
  const paired = { ...sections };
  for (const id of ['approach-explore', 'approach-structure', 'approach-direct', 'approach-verify']) paired[id] = { top: 8350, height: 300 };
  const responsive = createTimeline(paired, 1024);
  responsive.forEach((anchor, index) => {
    if (index) assert.ok(anchor.at > responsive[index - 1].at);
    assert.ok(evaluateTimeline(responsive, anchor.at).beams.flatMap(beam => beam.quaternion).every(Number.isFinite));
  });
  const aligned = responsive.find(anchor => anchor.pose === POSES.verify)!;
  assert.ok(aligned.at < responsive.find(anchor => anchor.pose === POSES.freelance)!.at);
  const a = new Quaternion(...aligned.pose.beams[0].quaternion);
  assert.ok(a.angleTo(new Quaternion(...aligned.pose.beams[1].quaternion)) < 1e-10);
  assert.ok(distance(aligned.pose.beams[0].position, aligned.pose.beams[1].position) > 4, 'alignment is not the final rejoin');
});

test('the world opens across both viewport edges and closes into the right composition', () => {
  assert.equal(POSES.opening.framingX, .29);
  assert.equal(POSES.contact.framingX, .29);
  for (const pose of [POSES.flight, POSES.enterprise, POSES.research]) {
    assert.equal(pose.framingX, 0);
    assert.ok(pose.beams[0].position[0] < -7);
    assert.ok(pose.beams[1].position[0] > 7);
  }
});
