'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Color, DataTexture, DirectionalLight, HemisphereLight, LinearFilter, LinearMipmapLinearFilter, Mesh, Fog, MeshStandardMaterial, PMREMGenerator, VSMShadowMap, PerspectiveCamera, Quaternion, RepeatWrapping, RGBAFormat, ShadowMaterial, Vector3 } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BEAM_DIMENSIONS, type ScenePose } from '../../lib/motion/timeline';
import { motionStore } from '../../lib/motion/store';

type Props = { onReady: () => void; onFailure: () => void };
const mobileQuery = '(max-width: 900px)';
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const isMobile = () => window.matchMedia(mobileQuery).matches;
const LIGHT = new Color('#f8eee2'); const DARK = new Color('#260b14');

type Point=[number,number];
function hull(points:Point[]):Point[]{
 const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(o:Point,a:Point,b:Point)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lower:Point[]=[],upper:Point[]=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
 for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return lower.concat(upper);
}
function updateGlyphMasks(meshes:(Mesh|null)[],camera:import('three').Camera,point:Vector3,width:number,height:number){
 if(document.documentElement.dataset.cinematic!=='true')return;
 const polygons=meshes.map(mesh=>mesh?hull([-.5,.5].flatMap(x=>[-3.25,3.25].flatMap(y=>[-.5,.5].map(z=>{
  point.set(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);return [(point.x+1)*width/2,(1-point.y)*height/2] as Point;
 })))):[]);
 meshes.forEach((mesh,index)=>{
  if(!mesh){polygons.push([]);return;}
  const side=index===0?.5:-.5;
  const normal=new Vector3(Math.sign(side),0,0).transformDirection(mesh.matrixWorld);
  const towardCamera=camera.position.clone().sub(mesh.position);
  polygons.push(normal.dot(towardCamera)>0?hull([-3.25,3.25].flatMap(y=>[-.5,.5].map(z=>{
    point.set(side,y,z).applyMatrix4(mesh.matrixWorld).project(camera);return [(point.x+1)*width/2,(1-point.y)*height/2] as Point;
  }))):[]);
 });
 document.querySelectorAll<HTMLElement>('.glyph-heading').forEach(heading=>{
  const rect=heading.getBoundingClientRect();if(rect.bottom<0||rect.top>height)return;
  heading.querySelectorAll<HTMLElement>(':scope > .glyph-copy').forEach((copy,index)=>{
   copy.style.clipPath=`polygon(${polygons[index].map(p=>`${(p[0]-rect.left).toFixed(1)}px ${(p[1]-rect.top).toFixed(1)}px`).join(',')})`;
  });
 });
}

function Studio({ onReady, onFailure, mobile }: Props & { mobile: boolean }) {
  const left = useRef<Mesh>(null); const right = useRef<Mesh>(null);
  const key = useRef<DirectionalLight>(null); const fill = useRef<HemisphereLight>(null); const rim = useRef<DirectionalLight>(null);
  const { invalidate, gl, setFrameloop, scene:world } = useThree();
  const pose = useRef<ScenePose>(motionStore.get());
  const firstFrame = useRef(true); const frames = useRef(0);
  const geometry = useMemo(() => new RoundedBoxGeometry(...BEAM_DIMENSIONS, 5, .038), []);
  const grain = useMemo(() => {
    const size=256, pixels=new Uint8Array(size*size*4);let seed=19347;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      const fine=seed/4294967296;
      const v=Math.max(0,Math.min(255,115+fine*135));pixels.set([v,v,v,255],(y*size+x)*4);
    }
    const texture=new DataTexture(pixels,size,size,RGBAFormat);
    texture.wrapS=texture.wrapT=RepeatWrapping;texture.generateMipmaps=true;
    texture.minFilter=LinearMipmapLinearFilter;texture.magFilter=LinearFilter;
    texture.repeat.set(1.8,11.7);texture.anisotropy=4;texture.needsUpdate=true;return texture;
  },[]);
  const materials=useMemo(()=>({
    outer:new MeshStandardMaterial({color:'#71393c',envMapIntensity:.07,roughness:.9,roughnessMap:grain,bumpMap:grain,bumpScale:.033,metalness:0}),
    coral:new MeshStandardMaterial({color:'#f6574e',envMapIntensity:.045,roughness:.86,roughnessMap:grain,bumpMap:grain,bumpScale:.025,metalness:0}),
    floor:new MeshStandardMaterial({envMapIntensity:0,color:LIGHT,roughness:1,metalness:0,emissive:LIGHT,emissiveIntensity:.32}),
    shadow:new ShadowMaterial({color:'#44211c',opacity:.50,depthWrite:false}),
  }),[grain]);

  const scratch = useMemo(() => ({ target: new Vector3(), forward: new Vector3(), right: new Vector3(), up: new Vector3(), relative: new Vector3(), center: new Vector3(), corner: new Vector3(), color: new Color(), warm: new Color('#ffb497'), white: new Color('#fff8f2'), rotation: new Quaternion() }), []);
  useEffect(()=>{
    const generator=new PMREMGenerator(gl),room=new RoomEnvironment();
    const environment=generator.fromScene(room,.08);world.environment=environment.texture;
    return()=>{world.environment=null;environment.dispose();generator.dispose();room.dispose();};
  },[gl,world]);
  useEffect(() => {
    const visibility = () => {
      setFrameloop(document.hidden ? 'never' : 'demand');
      if (!document.hidden) invalidate();
    };
    const unsubscribe = motionStore.subscribe(next => { pose.current = next; visibility(); });
    const contextLost = (event: Event) => { event.preventDefault(); onFailure(); };
    document.addEventListener('visibilitychange', visibility);
    gl.domElement.addEventListener('webglcontextlost', contextLost, false);
    visibility();
    return () => {
      unsubscribe(); document.removeEventListener('visibilitychange', visibility);
      gl.domElement.removeEventListener('webglcontextlost', contextLost);
    };
  }, [gl, invalidate, onFailure, setFrameloop]);
  useEffect(() => () => { geometry.dispose(); grain.dispose(); Object.values(materials).forEach(material => material.dispose()); }, [geometry, grain, materials]);
  useEffect(()=>{
    const headings=[...document.querySelectorAll<HTMLElement>('#hero-title,.display-name,#experience-title,#research-title,#approach-title,#freelance-title,#foundations-title,#contact-title')];
    headings.forEach(heading=>{
      heading.classList.add('glyph-heading');const content=heading.innerHTML;
      for(let i=0;i<4;i++){const copy=document.createElement('span');copy.className=i<2?'glyph-copy':'glyph-copy glyph-face';copy.setAttribute('aria-hidden','true');copy.setAttribute('inert','');copy.innerHTML=content;copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));heading.appendChild(copy);}
    });invalidate();
    return()=>headings.forEach(heading=>{heading.querySelectorAll(':scope > .glyph-copy').forEach(copy=>copy.remove());heading.classList.remove('glyph-heading');});
  },[invalidate]);
  useFrame(({ camera, scene, size }) => {
    if (document.hidden || document.documentElement.dataset.motionReady !== "true") return;
    const current = pose.current;
    const { target, forward, right: rightAxis, up, relative, center, color, rotation } = scratch;
    target.fromArray(current.target);
    camera.position.fromArray(current.camera);
    forward.copy(target).sub(camera.position).normalize();
    rightAxis.copy(forward).cross(up.set(0, 1, 0)).normalize();
    up.copy(rightAxis).cross(forward).normalize();
    const distance = camera.position.distanceTo(target);
    const aspect = size.width / size.height;
    // The mobile camera actually pulls back; the two objects keep their physical
    // dimensions. Reading compositions occupy a small upper-right illustration.
    if (mobile) camera.position.copy(target).addScaledVector(forward, -distance * 2.8);
    camera.lookAt(target);
    if (camera instanceof PerspectiveCamera) {
      camera.clearViewOffset();
      if (!mobile && current.framingX) camera.setViewOffset(size.width, size.height, -size.width * current.framingX, 0, size.width, size.height);
      camera.updateProjectionMatrix();
    }
    [left.current, right.current].forEach((mesh, i) => {
      if (!mesh) return;
      mesh.position.fromArray(current.beams[i].position);
      mesh.quaternion.copy(rotation.fromArray(current.beams[i].quaternion));
      if (mobile) {
        // Preserve the join in A/M and visibly separate the same pair in B–L.
        relative.copy(mesh.position).sub(target);
        const x = relative.dot(rightAxis), y = relative.dot(up), depth = relative.dot(forward);
        const spread = current.framingX > .1 ? 1 : .65;
        const mobileDistance = distance * 2.8;
        const halfHeight = Math.tan(31 * Math.PI / 360) * mobileDistance;
        mesh.position.copy(target).addScaledVector(rightAxis, halfHeight * aspect * .52 + x * spread)
          .addScaledVector(up, halfHeight * .59 + y * .55).addScaledVector(forward, depth * .4);
      } else if (current.framingX < .01) {
        // Fit beam CENTRES to the responsive artboard. Their geometry is rigid.
        relative.copy(mesh.position).sub(target);
        mesh.position.addScaledVector(rightAxis, relative.dot(rightAxis) * (aspect / 1.6 - 1));
      }
      mesh.updateMatrixWorld();
    });
    color.copy(LIGHT).lerp(DARK, current.darkness);
    scene.background = color;
    materials.floor.color.copy(color);
    materials.floor.emissive.copy(color);
    if (!scene.fog) scene.fog=new Fog(color,22,65);
    (scene.fog as Fog).color.copy(color);
    materials.shadow.color.set(current.darkness > .5 ? '#090309' : '#734d43');
    materials.shadow.opacity = .50 + current.darkness * .16;
    if (key.current) {
      key.current.position.fromArray(current.keyLight);
      key.current.intensity = 2.5 + current.darkness * .7;
      key.current.color.copy(scratch.white).lerp(scratch.warm, current.darkness);
    }
    if (fill.current) fill.current.intensity = 1.0 - current.darkness * .5;
    if (rim.current) rim.current.intensity = 3.5 + current.darkness * 2.5;
    camera.updateMatrixWorld();
    updateGlyphMasks([left.current,right.current],camera,scratch.corner,size.width,size.height);
    frames.current++;
    const stage = document.querySelector<HTMLElement>('[data-portfolio-stage]');
    if (stage) {
      stage.dataset.frameCount = String(frames.current); stage.dataset.beamCount = '2'; stage.dataset.geometry = 'shared-1x6.5x1';
      stage.dataset.scene = current.scene;
      // This is measurement evidence, not an alternative controller.
      if (process.env.NODE_ENV === 'development') {
        camera.updateMatrixWorld();
        const beams = [left.current, right.current].map(mesh => {
          if (!mesh) return null;
          const points = [-.5, .5].flatMap(x => [-3.25, 3.25].flatMap(y => [-.5, .5].map(z => {
            center.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
            return [(center.x + 1) / 2, (1 - center.y) / 2];
          })));
          return { position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), bounds: { left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])), top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1])) } };
        });
        const inspection = { ...window.__kinetic?.getState(), chapter: current.chapter, scene: current.scene, localProgress: current.localProgress, scroll: window.scrollY, darkness: current.darkness, camera: camera.position.toArray(), target: target.toArray(), beams };
        stage.dataset.inspection = JSON.stringify(inspection);
        const inspector = document.getElementById('scene-inspector');
        if (inspector) inspector.textContent = JSON.stringify(inspection, null, 2);
      }
    }
    if (firstFrame.current) { firstFrame.current = false; onReady(); }
  });
  return <>
    <hemisphereLight ref={fill} args={['#fff3e5', '#6b3d3e', 1.7]} />
    <directionalLight ref={key} position={[-5, 10, 7]} intensity={3.3} color="#fff1df" castShadow={!mobile}
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-.0002} shadow-normalBias={.025} shadow-radius={9} shadow-blurSamples={12}
      shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}
      shadow-camera-near={.5} shadow-camera-far={60} />
    <directionalLight ref={rim} position={[-6, 7, 4]} intensity={3.5} color="#ffd3bd" />
    <mesh ref={left} name="beam-left" geometry={geometry} material={[materials.coral, materials.outer, materials.outer, materials.outer, materials.outer, materials.outer]} castShadow receiveShadow dispose={null} />
    <mesh ref={right} name="beam-right" geometry={geometry} material={[materials.outer, materials.coral, materials.outer, materials.outer, materials.outer, materials.outer]} castShadow receiveShadow dispose={null} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} material={materials.floor} receiveShadow>
      <planeGeometry args={[200, 200]} />
    </mesh>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,.015,0]} material={materials.shadow} receiveShadow><planeGeometry args={[200,200]}/></mesh>
  </>;
}

export default function PortfolioScene(props: Props) {
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, () => true);
  return <Canvas frameloop="demand" dpr={[1, mobile ? 1.15 : 1.5]} shadows={mobile ? false : { type: VSMShadowMap }}
    camera={{ position: [4.8, 4.8, 11.8], fov: 31, near: .2, far: 140 }}
    gl={{ alpha: false, antialias: !mobile, powerPreference: 'low-power', preserveDrawingBuffer: false }}
    fallback={null} onCreated={({ gl }) => { gl.setClearColor(LIGHT, 1); }}>
    <Studio {...props} mobile={mobile} />
  </Canvas>;
}
