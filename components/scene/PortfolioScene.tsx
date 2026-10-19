'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { BackSide, Color, DataTexture, DirectionalLight, HemisphereLight, LinearFilter, LinearMipmapLinearFilter, Mesh, Fog, MeshBasicMaterial, MeshStandardMaterial, NoColorSpace, PMREMGenerator, VSMShadowMap, PerspectiveCamera, Quaternion, RepeatWrapping, RGBAFormat, ShadowMaterial, SRGBColorSpace, Vector2, Vector3 } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { studioColor } from '../../lib/motion/palette';
import { BEAM_BEVEL, BEAM_DIMENSIONS, type ScenePose } from '../../lib/motion/timeline';
import { motionStore } from '../../lib/motion/store';

type Props = { onReady: () => void; onFailure: () => void };
const mobileQuery = '(max-width: 900px)';
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const isMobile = () => window.matchMedia(mobileQuery).matches;
const LIGHT = new Color('#f8eee2');

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
  // Only the far arm's inner face is coral. The near arm is wine all around.
  if(!mesh||index===0){polygons.push([]);return;}
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
   copy.style.clipPath=polygons[index].length?`polygon(${polygons[index].map(p=>`${(p[0]-rect.left).toFixed(1)}px ${(p[1]-rect.top).toFixed(1)}px`).join(',')})`:'polygon(0 0,0 0,0 0)';
  });
 });
}

function Studio({ onReady, onFailure, mobile }: Props & { mobile: boolean }) {
  const left = useRef<Mesh>(null); const right = useRef<Mesh>(null);
  const key = useRef<DirectionalLight>(null); const fill = useRef<HemisphereLight>(null); const rim = useRef<DirectionalLight>(null);
  const { invalidate, gl, setFrameloop } = useThree();
  const pose = useRef<ScenePose>(motionStore.get());
  const firstFrame = useRef(true); const frames = useRef(0);
  const geometry = useMemo(() => {
    const box = new RoundedBoxGeometry(...BEAM_DIMENSIONS, 5, BEAM_BEVEL);
    // Keep particle scale equal on the one-unit caps and 6.5-unit side faces.
    const uv = box.getAttribute('uv');
    for (const group of box.groups) if (group.materialIndex === 2 || group.materialIndex === 3) {
      for (let i = group.start; i < group.start + group.count; i++) uv.setY(i, uv.getY(i) / BEAM_DIMENSIONS[1]);
    }
    return box;
  }, []);
  const grain = useMemo(() => {
    const size=256, noise=new Float32Array(size*size);let seed=19347;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      noise[y*size+x]=seed/4294967296;
    }
    const at=(x:number,y:number)=>noise[((y+size)%size)*size+(x+size)%size];
    const height=(x:number,y:number)=>at(x,y)*.45+(at(x-1,y)+at(x+1,y)+at(x,y-1)+at(x,y+1))*.1+(at(x-2,y-2)+at(x+2,y+2)+at(x-2,y+2)+at(x+2,y-2))*.0375;
    const normals=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),albedo=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const h=height(x,y),offset=(y*size+x)*4;
      const nx=(height(x-1,y)-height(x+1,y))*1.9,ny=(height(x,y-1)-height(x,y+1))*1.9;
      const length=Math.hypot(nx,ny,1),r=195+h*60,c=238+h*17;
      normals.set([(nx/length*.5+.5)*255,(ny/length*.5+.5)*255,(1/length*.5+.5)*255,255],offset);
      roughness.set([r,r,r,255],offset);albedo.set([c,c,c,255],offset);
    }
    const texture=(pixels:Uint8Array,colorSpace:string=NoColorSpace)=>{
      const map=new DataTexture(pixels,size,size,RGBAFormat);
      map.colorSpace=colorSpace;map.wrapS=map.wrapT=RepeatWrapping;map.generateMipmaps=true;
      map.minFilter=LinearMipmapLinearFilter;map.magFilter=LinearFilter;
      // Resolve irregular powder particles rather than subpixel white noise.
      map.repeat.set(1.15,1.15*BEAM_DIMENSIONS[1]);map.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());map.needsUpdate=true;return map;
    };
    return {normal:texture(normals),roughness:texture(roughness),albedo:texture(albedo,SRGBColorSpace)};
  },[gl]);
  const materials=useMemo(()=>({
    outer:new MeshStandardMaterial({color:'#400b12',map:grain.albedo,envMapIntensity:.09,roughness:.91,roughnessMap:grain.roughness,normalMap:grain.normal,normalScale:new Vector2(.22,.22),metalness:0}),
    coral:new MeshStandardMaterial({color:'#b93222',map:grain.albedo,envMapIntensity:.065,roughness:.88,roughnessMap:grain.roughness,normalMap:grain.normal,normalScale:new Vector2(.20,.20),metalness:0}),
    floor:new MeshBasicMaterial({color:LIGHT,fog:false,toneMapped:false}),
    // VSM renders receiveShadow objects into its depth pass too. Cull this
    // upward-facing receiver from that pass to avoid floor self-shadow seams.
    shadow:new ShadowMaterial({color:'#44211c',opacity:.50,depthWrite:false,fog:false,shadowSide:BackSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
  }),[grain]);

  const scratch = useMemo(() => ({ target: new Vector3(), forward: new Vector3(), right: new Vector3(), up: new Vector3(), relative: new Vector3(), center: new Vector3(), corner: new Vector3(), color: new Color(), shadowColor:new Color(), warm: new Color('#ffb497'), white: new Color('#fff8f2'), rotation: new Quaternion() }), []);
  const environment=useMemo(()=>{
    const generator=new PMREMGenerator(gl),room=new RoomEnvironment();
    const texture=generator.fromScene(room,.08);generator.dispose();room.dispose();return texture;
  },[gl]);
  useEffect(()=>()=>environment.dispose(),[environment]);
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
  useEffect(() => () => { geometry.dispose(); Object.values(grain).forEach(texture=>texture.dispose()); Object.values(materials).forEach(material => material.dispose()); }, [geometry, grain, materials]);
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
        const mobileDistance = distance * 2.8;
        const halfHeight = Math.tan(31 * Math.PI / 360) * mobileDistance;
        mesh.position.copy(target).addScaledVector(rightAxis, halfHeight * aspect * .52 + x)
          .addScaledVector(up, halfHeight * .59 + y).addScaledVector(forward, depth);
      } else {
        // Fit beam CENTRES to the responsive artboard. Their geometry is rigid.
        // Blend into reading framing continuously instead of switching at .01.
        relative.copy(mesh.position).sub(target);
        const reading=Math.max(0,Math.min(1,1-current.framingX/.2));
        const responsive=reading*reading*(3-2*reading);
        mesh.position.addScaledVector(rightAxis, relative.dot(rightAxis) * (aspect / 1.6 - 1)*responsive);
      }
      mesh.updateMatrixWorld();
    });
    color.set(studioColor(current.darkness));
    scene.background = color;
    materials.floor.color.copy(color);
    if (!scene.fog) scene.fog=new Fog(color,40,100);
    (scene.fog as Fog).color.copy(color);
    materials.shadow.color.set('#734d43').lerp(scratch.shadowColor.set('#090309'),current.darkness);
    materials.shadow.setValues({opacity:.50+current.darkness*.16});
    if (key.current) {
      key.current.position.fromArray(current.keyLight);
      key.current.intensity = 2.2 + current.darkness * .7;
      key.current.color.copy(scratch.white).lerp(scratch.warm, current.darkness);
    }
    if (fill.current) fill.current.intensity = .42 + current.darkness * .05;
    if (rim.current) rim.current.intensity = .65 + current.darkness * .8;
    camera.updateMatrixWorld();
    updateGlyphMasks([left.current,right.current],camera,scratch.corner,size.width,size.height);
    frames.current++;
    const stage = document.querySelector<HTMLElement>('[data-portfolio-stage]');
    if (stage) {
      stage.dataset.frameCount = String(frames.current); stage.dataset.beamCount = '2'; stage.dataset.geometry = 'shared-1x6.5x1';
      stage.dataset.scene = current.scene;stage.dataset.chapter=current.chapter;
      // This is measurement evidence, not an alternative controller.
      if (process.env.NODE_ENV === 'development') {
        camera.updateMatrixWorld();
        const beams = [left.current, right.current].map(mesh => {
          if (!mesh) return null;
          const points = [-.5, .5].flatMap(x => [-3.25, 3.25].flatMap(y => [-.5, .5].map(z => {
            center.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
            return [(center.x + 1) / 2, (1 - center.y) / 2];
          })));
          center.copy(mesh.position).project(camera);
          return { position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), projectedCenter:[(center.x+1)/2,(1-center.y)/2], projectedCorners:points, bounds: { left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])), top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1])) } };
        });
        const inspection = { headerBottom:document.querySelector('.site-header')?.getBoundingClientRect().bottom, readingInset:window.__kinetic?.timeline.readingInset, headingBounds:Object.fromEntries([...document.querySelectorAll('h1,h2')].map(el=>[el.id,el.getBoundingClientRect().toJSON()])), ...window.__kinetic?.getState(), chapter: current.chapter, scene: current.scene, localProgress: current.localProgress, scroll: window.scrollY, darkness: current.darkness, camera: camera.position.toArray(), target: target.toArray(), beams };
        stage.dataset.inspection = JSON.stringify(inspection);
        const inspector = document.getElementById('scene-inspector');
        if (inspector) inspector.textContent = JSON.stringify(inspection, null, 2);
      }
    }
    if (firstFrame.current) { firstFrame.current = false; onReady(); }
  });
  return <>
    <primitive object={environment.texture} attach="environment" />
    <hemisphereLight ref={fill} args={['#fff3e5', '#6b3d3e', 1.7]} />
    <directionalLight ref={key} position={[-5, 10, 7]} intensity={3.3} color="#fff1df" castShadow={!mobile}
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-.00012} shadow-normalBias={.012} shadow-radius={19} shadow-blurSamples={24}
      shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18}
      shadow-camera-near={.5} shadow-camera-far={60} />
    <directionalLight ref={rim} position={[-6, 7, 4]} intensity={3.5} color="#ffd3bd" />
    <mesh ref={left} name="beam-left" geometry={geometry} material={materials.outer} castShadow receiveShadow dispose={null} />
    <mesh ref={right} name="beam-right" geometry={geometry} material={[materials.outer, materials.coral, materials.outer, materials.outer, materials.outer, materials.outer]} castShadow receiveShadow dispose={null} />
    {/* VSM needs the real floor depth behind the separate receiver to filter
        the caster edge against ground, rather than the empty map's far plane. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.16, 0]} material={materials.floor} castShadow>
      <planeGeometry args={[200, 200]} />
    </mesh>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,.002,0]} material={materials.shadow} receiveShadow><planeGeometry args={[200,200]}/></mesh>
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
