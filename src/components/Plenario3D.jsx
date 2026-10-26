import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, ContactShadows, Text } from "@react-three/drei";
import { blockSeats } from "./data.js";
import SceneBoundary from './SceneBoundary.jsx';

// Escala simbólica com 72 cadeiras. NÃO representa composição real de uma casa.
const ROWS = [{radius:4.65,count:18,rise:0},{radius:6.55,count:24,rise:.18},{radius:8.5,count:30,rise:.36}];
const START=.12*Math.PI, END=.88*Math.PI;
const chairUnits=ROWS.flatMap((row,ri)=>Array.from({length:row.count},(_,i)=>{
  const theta=START+(END-START)*(i/(row.count-1));
  return {id:ri*100+i+1,number:ROWS.slice(0,ri).reduce((s,r)=>s+r.count,0)+i+1,
    row:ri+1,theta, radius:row.radius, rise:row.rise, x:Math.cos(theta)*row.radius,z:-Math.sin(theta)*row.radius};
})).map((v,i)=>{
  let used=0;const b=blockSeats.find(block=>{used+=block.count;return i<used;})||blockSeats.at(-1);
  return {...v,block:b.id,name:b.name,color:b.color};
});

// Banda extrudida de madeira acompanhando a curvatura do plenário
function ArcStrip({radius,inner,y,color="#9c683f",thickness=.13}){
  const geometry=useMemo(()=>{
    const s=new THREE.Shape();
    const steps=90;
    for(let k=0;k<=steps;k++){
      const t=START+(END-START)*k/steps;
      const x=Math.cos(t)*radius, v=Math.sin(t)*radius;
      if(k===0)s.moveTo(x,v);else s.lineTo(x,v);
    }
    for(let k=steps;k>=0;k--){
      const t=START+(END-START)*k/steps;
      s.lineTo(Math.cos(t)*inner,Math.sin(t)*inner);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:20});
  },[radius,inner,thickness]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} rotation-x={-Math.PI/2} position={[0,y,0]} receiveShadow castShadow>
    <meshStandardMaterial color={color} roughness={.71} metalness={.05}/>
  </mesh>;
}

function Chair({seat,index,selected,focus,onPick,replay}) {
  const root=useRef();
  const clock=useRef(0);
  const [hover,setHover]=useState(false);
  useEffect(()=>{
    clock.current=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?6:0;
  },[replay]);
  useFrame((_,dt)=>{
    clock.current=Math.min(clock.current+dt,6);
    const t=THREE.MathUtils.clamp((clock.current-.24-index*.021)/.68,0,1);
    const eased=1-(1-t)**3;
    if(root.current){
      root.current.scale.setScalar(.06+.94*eased);
      root.current.position.y=seat.rise-1.6*(1-eased);
    }
  });
  const subdued=focus!=="todos"&&focus!==seat.block;
  // Coloração por GRUPO CENOGRÁFICO, não por espectro político ou assentos reais.
  const upholstery=subdued?"#7d8996":hover||selected?"#f7d891":seat.color;
  return <group ref={root} position={[seat.x,seat.rise,seat.z]} rotation-y={seat.theta-Math.PI/2}
    onClick={e=>{e.stopPropagation();onPick(seat);}}
    onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor="pointer";}}
    onPointerOut={()=>{setHover(false);document.body.style.cursor="";}}>
      <mesh position={[0,.11,0]} castShadow><cylinderGeometry args={[.22,.22,.085,16]}/><meshStandardMaterial color="#4a5360" metalness={.48} roughness={.43}/></mesh>
      <mesh position={[0,.38,0]}><cylinderGeometry args={[.065,.065,.52,12]}/><meshStandardMaterial color="#6a6c71" metalness={.6} roughness={.35}/></mesh>
      <RoundedBox args={[.68,.17,.56]} radius={.07} smoothness={3} position={[0,.7,.05]} castShadow>
        <meshStandardMaterial color={upholstery} roughness={.86} />
      </RoundedBox>
      <RoundedBox args={[.68,.77,.16]} radius={.09} smoothness={3} position={[0,1.07,-.22]} rotation-x={-.14} castShadow>
        <meshStandardMaterial color={upholstery} roughness={.8}/>
      </RoundedBox>
      {[-1,1].map(s=><group key={s}>
        <mesh position={[s*.385,.8,-.02]}><boxGeometry args={[.045,.26,.42]}/><meshStandardMaterial color="#535963" metalness={.35}/></mesh>
        <mesh position={[s*.385,.94,.04]}><boxGeometry args={[.09,.075,.42]}/><meshStandardMaterial color="#b88a51" roughness={.65}/></mesh>
      </group>)}
      <mesh position={[0,1.08,-.326]}>
        <boxGeometry args={[.33,.105,.025]}/>
        <meshStandardMaterial color={subdued?"#8b9189":seat.color} emissive={selected?seat.color:"#000000"} emissiveIntensity={selected?.4:0}/>
      </mesh>
      {(selected||hover)&&<mesh rotation-x={-Math.PI/2} position={[0,.045,0]}>
        <ringGeometry args={[.43,.51,32]}/>
        <meshBasicMaterial color="#ffd664" side={THREE.DoubleSide}/>
      </mesh>}
    </group>;
}

function Chamber(){
 return <>
   {/* O carpete contém a maquete. O tablado presidencial e a tribuna são peças diferentes. */}
   <mesh position={[0,-.16,-3.0]} receiveShadow><cylinderGeometry args={[11.45,11.45,.25,96]}/><meshStandardMaterial color="#123d78" roughness={1}/></mesh>
   <mesh rotation-x={-Math.PI/2} position={[0,-.02,-3.1]} receiveShadow><planeGeometry args={[23.4,19.5]}/><meshStandardMaterial color="#184a90" roughness={1}/></mesh>
   {ROWS.map((r,i)=><group key={i}>
      <ArcStrip radius={r.radius+.42} inner={r.radius-1.12} y={-.095+r.rise} color={['#1a4887','#245694','#2a629c'][i]} thickness={.12}/>
      <ArcStrip radius={r.radius-.35} inner={r.radius-1.02} y={.78+r.rise} color="#bd8047"/>
      <ArcStrip radius={r.radius-.36} inner={r.radius-.4} y={.74+r.rise} color="#efc786" thickness={.15}/>
      {Array.from({length:11},(_,k)=>{
        const t=START+(END-START)*k/10;
        const rad=r.radius-.72;
        return <mesh key={k} position={[Math.cos(t)*rad,.36+r.rise,-Math.sin(t)*rad]}>
           <cylinderGeometry args={[.044,.044,.66,8]}/><meshStandardMaterial color="#646269" metalness={.53} roughness={.39}/>
        </mesh>;
      })}
   </group>)}
   {/* TABLADO DE PRESIDÊNCIA: dois degraus e uma mesa diretora elevada. */}
   <group position={[0,0,.38]}>
     <RoundedBox args={[8.25,.29,3.05]} radius={.08} smoothness={3} position={[0,.03,0]} castShadow><meshStandardMaterial color="#0d3770" roughness={.92}/></RoundedBox>
     <RoundedBox args={[8.05,.065,2.83]} radius={.02} smoothness={3} position={[0,.20,-.04]} castShadow><meshStandardMaterial color="#d9a463" roughness={.74}/></RoundedBox>
     <RoundedBox args={[7.25,.23,.72]} radius={.025} smoothness={3} position={[0,.05,1.56]} castShadow><meshStandardMaterial color="#92623f" roughness={.73}/></RoundedBox>
     <RoundedBox args={[6.3,.13,.46]} radius={.025} smoothness={3} position={[0,.05,2.13]} castShadow><meshStandardMaterial color="#bf8951" roughness={.73}/></RoundedBox>
     {/* Mesa diretora: tampo curvo, painéis frontais, microfones e cadeiras presidenciais. */}
     <RoundedBox args={[6.3,.87,1.0]} radius={.08} smoothness={4} position={[0,.72,-.42]} castShadow><meshStandardMaterial color="#815333" roughness={.68}/></RoundedBox>
     <RoundedBox args={[6.56,.14,1.20]} radius={.055} smoothness={4} position={[0,1.23,-.44]} castShadow><meshStandardMaterial color="#dfb37a" roughness={.55}/></RoundedBox>
     <mesh position={[0,.76,.102]}><boxGeometry args={[2.25,.37,.025]}/><meshStandardMaterial color="#16417a"/></mesh>
     <Text position={[0,.76,.125]} fontSize={.18} anchorX="center" anchorY="middle" color="#fff2d8" maxWidth={2.2}>MESA DIRETORA</Text>
     {[-2.1,0,2.1].map(x=><group key={x} position={[x,1.15,-.7]}>
       <RoundedBox args={[.72,.16,.62]} radius={.07} position={[0,.16,-.34]} castShadow><meshStandardMaterial color="#164985"/></RoundedBox>
       <RoundedBox args={[.72,.85,.16]} radius={.07} position={[0,.58,-.60]} castShadow><meshStandardMaterial color="#164985"/></RoundedBox>
       <mesh position={[0,.42,.22]}><cylinderGeometry args={[.018,.018,.34,9]}/><meshStandardMaterial color="#22272a" metalness={.35}/></mesh>
       <mesh position={[0,.6,.27]} rotation-x={-.30}><boxGeometry args={[.19,.035,.075]}/><meshStandardMaterial color="#282b31"/></mesh>
     </group>)}
     {[-3.05,3.05].map(x=><mesh key={x} position={[x,.79,-.43]}><boxGeometry args={[.08,.73,1.12]}/><meshStandardMaterial color="#e6c18d" roughness={.65}/></mesh>)}
   </group>
   {/* TRIBUNA: no eixo de frente da mesa, com púlpito inclinado e microfones. */}
   <group position={[0,0,3.15]}>
     <RoundedBox args={[1.45,.15,1.18]} radius={.03} position={[0,.12,0]} castShadow><meshStandardMaterial color="#e2b57c" roughness={.7}/></RoundedBox>
     <RoundedBox args={[1.22,1.32,.8]} radius={.06} position={[0,.85,0]} castShadow><meshStandardMaterial color="#a66e42" roughness={.75}/></RoundedBox>
     <RoundedBox args={[1.49,.16,1.02]} radius={.03} position={[0,1.56,-.11]} rotation-x={-.13} castShadow><meshStandardMaterial color="#edd09c" roughness={.66}/></RoundedBox>
     <mesh position={[0,.95,.41]}><boxGeometry args={[.77,.47,.03]}/><meshStandardMaterial color="#184b88"/></mesh>
     <Text position={[0,.94,.443]} fontSize={.20} anchorX="center" anchorY="middle" color="#ffe6a6">TRIBUNA</Text>
     {[-.25,.25].map(x=><group key={x} position={[x,1.69,-.25]}><mesh><cylinderGeometry args={[.017,.017,.33,8]}/><meshStandardMaterial color="#303235" metalness={.55}/></mesh><mesh position={[0,.18,.015]} rotation-x={-.17}><boxGeometry args={[.15,.028,.042]}/><meshStandardMaterial color="#252931"/></mesh></group>)}
   </group>
   {/* Painéis acústicos e iluminação: arquitetura de um plenário, sem escudos oficiais. */}
   <mesh position={[0,2.5,-11.12]}><boxGeometry args={[24.5,5.1,.37]}/><meshStandardMaterial color="#c7baa3" roughness={1}/></mesh>
   {Array.from({length:30},(_,i)=><mesh key={i} position={[-11.9+i*.82,2.5,-10.87]}><boxGeometry args={[.075,5.08,.09]}/><meshStandardMaterial color={i%3===0?'#a7947b':'#ded5c5'} roughness={.85}/></mesh>)}
   <RoundedBox args={[5.8,1.15,.20]} radius={.025} smoothness={3} position={[0,4.0,-10.62]}><meshStandardMaterial color="#1c4888"/></RoundedBox>
   <mesh position={[0,3.24,-10.46]}><boxGeometry args={[3.4,.11,.09]}/><meshStandardMaterial color="#e8bf6c"/></mesh>
   {[-1,1].map(side=><group key={side} position={[side*10.4,0,-2.8]}><mesh position={[0,2.2,0]}><boxGeometry args={[.33,4.6,10.9]}/><meshStandardMaterial color="#d0c6b3"/></mesh><mesh position={[0,4.4,0]}><boxGeometry args={[.37,.17,10.9]}/><meshStandardMaterial color="#b48d62"/></mesh></group>)}
 </>;
}

export const plenarioAssentos = chairUnits;

function CameraEntrance({controlRef,replay}){
 const {camera}=useThree();
 const anim=useRef(0);
 useEffect(()=>{
   const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
   anim.current=reduced?3.7:0;
   camera.position.set(reduced?8.1:0,reduced?8.4:3.1,reduced?13.8:7.6);
   if(controlRef.current&&reduced){
     controlRef.current.target.set(0,.9,-3.1);
     controlRef.current.enabled=true;
     controlRef.current.update();
   }
 },[replay,camera,controlRef]);
 useFrame((_,dt)=>{
   if(anim.current>=3.7)return;
   anim.current=Math.min(anim.current+dt,3.7);
   const t=THREE.MathUtils.smoothstep(anim.current,0,3.5);
   camera.position.set(0+(8.1*t),3.1+5.3*t,7.6+6.2*t);
   if(controlRef.current){
      controlRef.current.target.set(0,1.05-0.15*t,0-3.1*t);
      controlRef.current.update();
      controlRef.current.enabled=t>=1;
   }
 });
 return null;
}

function Room({focus,selectedSeat,onPick,replay,seats}){
 const control=useRef();
 return <>
  <color attach="background" args={["#ded2bc"]}/>
  <ambientLight intensity={1.6}/>
  <hemisphereLight args={["#e4f2ff","#665342",1.5]}/>
  <directionalLight position={[8,15,9]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}/>
  <directionalLight position={[-7,7,-5]} intensity={.95} color="#bed2ed"/>
  <Chamber/>
  {seats.map((seat,index)=><Chair key={seat.id} seat={seat} index={index} selected={selectedSeat?.number===seat.number} focus={focus} onPick={onPick} replay={replay}/>)}
  <ContactShadows position={[0,-.16,-3]} scale={24} blur={1.8} opacity={.22} far={10}/>
  <OrbitControls ref={control} makeDefault enablePan={false} minDistance={8} maxDistance={27} minPolarAngle={.3} maxPolarAngle={1.48} target={[0,.9,-3.1]} maxAzimuthAngle={1.3} minAzimuthAngle={-1.3}/>
  <CameraEntrance replay={replay} controlRef={control}/>
 </>;
}

export default function Plenario3D({focus="todos",selectedSeat,onPick,replay=0,seats=chairUnits,sourceCaption="Cadeiras ilustrativas — cores por grupos de demonstração, sem representação partidária ou ideológica."}){
  return (
    <SceneBoundary fallback={<div className="plenario-fallback-v8"><h3>PLENÁRIO EM VISTA SIMPLIFICADA</h3><div className="plenario-fallback-pulpit">MESA DIRETORA · TRIBUNA</div><div className="plenario-fallback-seats">{seats.map(seat=><button key={seat.id} style={{background:focus!=="todos"&&focus!==seat.block?'#8393a2':seat.color}} onClick={()=>onPick(seat)} aria-label={`Cadeira ${seat.number}, ${seat.name}`} title={`Cadeira ${seat.number} · ${seat.name}`}/>)}</div><p>{sourceCaption}</p></div>}>
      <Canvas shadows dpr={[1,1.75]} camera={{position:[0,3,7],fov:41}} gl={{antialias:true}} fallback={<p>Visualização 3D indisponível.</p>}>
        <Room focus={focus} selectedSeat={selectedSeat} onPick={onPick} replay={replay} seats={seats}/>
      </Canvas>
    </SceneBoundary>
  );
}
