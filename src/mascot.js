import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function createMascot(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,60);camera.position.set(0,1.7,6.7);camera.lookAt(0,1.50,0);
 scene.add(new THREE.HemisphereLight(0xfffbe5,0x758969,2));
 const key=new THREE.DirectionalLight(0xfff8df,2.5);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
 const rim=new THREE.DirectionalLight(0xe5f7d8,2);rim.position.set(4,3,-2);scene.add(rim);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=.015;scene.add(ground);
 const gltf=await new GLTFLoader().loadAsync('assets/mascot.glb');const model=gltf.scene;scene.add(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.name==='Sage velvet')o.material.roughness=1;}});
 // Short, locally attached fibers follow each animated mesh (no baked character image).
 const velvet=[];model.traverse(o=>{if(o.isMesh&&o.material?.name==='Sage velvet')velvet.push(o);});
 for(const mesh of velvet){const count=mesh.name==='Body'?16000:mesh.name.startsWith('Paw')?3000:1500;const sampler=new MeshSurfaceSampler(mesh).build();const vertices=new Float32Array(count*6),colors=new Float32Array(count*6);const p=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<count;i++){sampler.sample(p,n);const len=.014+Math.random()*.022;const shade=.40+Math.max(0,n.y)*.12+Math.random()*.10;for(let k=0;k<2;k++){const ix=i*6+k*3;vertices[ix]=p.x+n.x*len*k;vertices[ix+1]=p.y+n.y*len*k;vertices[ix+2]=p.z+n.z*len*k;colors[ix]=shade*.90;colors[ix+1]=shade*1.12;colors[ix+2]=shade*.62;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(vertices,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false})));
 }
 const left=model.getObjectByName('Arm_L'),right=model.getObjectByName('Arm_R'),eyes=['Eye_L','Eye_R'].map(n=>model.getObjectByName(n));
 const bases=eyes.map(e=>e?.scale.clone());let mode='idle',raf,lastFrame=0;
 function resize(){const {width,height}=canvas.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=Math.max(6.7,5.2/camera.aspect);camera.updateProjectionMatrix();}const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function frame(ms){raf=requestAnimationFrame(frame);if(document.hidden||ms-lastFrame<33)return;lastFrame=ms;const t=ms*.001,slow=reduced?0:Math.sin(t*2);model.position.y=mode==='celebrate'?Math.abs(Math.sin(t*4))*.24:slow*.035;model.rotation.z=mode==='confused'?.12:Math.sin(t)*.025;model.rotation.y=mode==='twist'?Math.sin(t*1.3)*.65:Math.sin(t*.5)*.08;
 const a=mode==='open'?.6+Math.sin(t*2)*.35:mode==='up'?1.8+Math.sin(t*2)*.35:mode==='celebrate'?1.1+Math.sin(t*6)*.4:.04+slow*.05;
 // glTF uses Y up; rotate the arms around the front-facing Z axis.
 if(left)left.rotation.z=mode==='updown'?-(1+Math.sin(t*1.5)*.9):mode==='twist'?-.45:-a;if(right)right.rotation.z=mode==='updown'?1-Math.sin(t*1.5)*.9:mode==='twist'?.45:a;
 eyes.forEach((e,i)=>{if(e)e.scale.y=bases[i].y*(t%5<.14?.12:1);});
 renderer.render(scene,camera);
 }raf=requestAnimationFrame(frame);
 return {setMode:m=>{mode=m;},dispose:()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.dispose();}};
}
