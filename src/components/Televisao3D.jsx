import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei';
import SceneBoundary from './SceneBoundary.jsx';

function ScreenTexture({ channel, onNext }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 940;
    const c = canvas.getContext('2d');
    c.fillStyle = '#092c46';
    c.fillRect(0, 0, 1400, 940);
    const gradient = c.createLinearGradient(0, 0, 0, 940);
    gradient.addColorStop(0, '#0a5066');
    gradient.addColorStop(1, '#07192b');
    c.fillStyle = gradient;
    c.fillRect(0, 0, 1400, 940);

    // Linhas de fósforo CRT
    for (let y = 0; y < 940; y += 8) {
      c.fillStyle = 'rgba(255,255,255,.04)';
      c.fillRect(0, y, 1400, 3);
    }

    c.fillStyle = '#e8bb46';
    c.fillRect(50, 50, 1300, 10);
    c.fillStyle = '#f6edce';
    c.font = '900 50px monospace';
    c.fillText('ARQUIVO / TV ELEITORAL', 70, 145);

    // Indicador "NO AR"
    c.fillStyle = '#e24a3b';
    c.beginPath();
    c.arc(1280, 130, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fce8e6';
    c.font = '700 28px monospace';
    c.fillText('NO AR', 1170, 140);

    const fitText = (text, size, weight, family, x, y, maxWidth = 1240) => {
      let fitted = size;
      c.font = `${weight} ${fitted}px ${family}`;
      while (c.measureText(text).width > maxWidth && fitted > 16) {
        fitted -= 2;
        c.font = `${weight} ${fitted}px ${family}`;
      }
      c.fillText(text, x, y);
    };

    c.fillStyle = '#d9e8ef';
    fitText(String(channel?.name || '').toUpperCase(), 68, 800, 'sans-serif', 70, 330);
    c.fillStyle = '#f6e7bd';
    fitText(String(channel?.value ?? ''), 230, 900, 'sans-serif', 70, 610);
    c.fillStyle = '#cbe6e9';
    fitText(String(channel?.detail || ''), 38, 600, 'monospace', 70, 720);
    c.fillStyle = '#e8bb46';
    c.fillRect(70, 775, 1150, 9);

    c.fillStyle = '#f0cf74';
    c.font = '700 32px monospace';
    c.fillText('TOQUE NA TELA PARA TROCAR DE CANAL ↻', 70, 845);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [channel]);

  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={[0, 0.28, 1.02]}
      onClick={(e) => {
        e.stopPropagation();
        onNext();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <planeGeometry args={[3.88, 2.65]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Television({ channel, onNext }) {
  return (
    <group position={[0, 0.36, 0]} rotation-y={-0.13}>
      <RoundedBox args={[5.3, 3.8, 1.65]} radius={0.28} smoothness={5} castShadow>
        <meshStandardMaterial color="#856341" roughness={0.73} />
      </RoundedBox>
      <RoundedBox
        args={[4.65, 3.32, 0.16]}
        radius={0.23}
        smoothness={3}
        position={[-0.24, 0.28, 0.9]}
      >
        <meshStandardMaterial color="#302924" roughness={0.83} />
      </RoundedBox>
      <ScreenTexture channel={channel} onNext={onNext} />
      <mesh
        position={[2.31, 0.75, 0.96]}
        rotation-x={Math.PI / 2}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <cylinderGeometry args={[0.205, 0.205, 0.1, 28]} />
        <meshStandardMaterial color="#d4bc8e" metalness={0.65} roughness={0.31} />
      </mesh>
      <mesh
        position={[2.31, 0.02, 0.96]}
        rotation-x={Math.PI / 2}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <cylinderGeometry args={[0.16, 0.16, 0.1, 28]} />
        <meshStandardMaterial color="#d4bc8e" metalness={0.65} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[2.05 + (i % 2) * 0.19, -0.68 + Math.floor(i / 2) * 0.19, 0.98]}>
          <boxGeometry args={[0.09, 0.12, 0.015]} />
          <meshStandardMaterial color="#c9b28d" />
        </mesh>
      ))}
      <mesh position={[-1.7, -2.03, 0]} castShadow>
        <boxGeometry args={[0.35, 0.45, 0.95]} />
        <meshStandardMaterial color="#322d29" />
      </mesh>
      <mesh position={[1.7, -2.03, 0]} castShadow>
        <boxGeometry args={[0.35, 0.45, 0.95]} />
        <meshStandardMaterial color="#322d29" />
      </mesh>
      <mesh position={[-0.7, 2.39, 0]} rotation-z={-0.35}>
        <cylinderGeometry args={[0.037, 0.037, 1.55, 12]} />
        <meshStandardMaterial color="#a39a91" metalness={0.8} />
      </mesh>
      <mesh position={[0.7, 2.39, 0]} rotation-z={0.35}>
        <cylinderGeometry args={[0.037, 0.037, 1.55, 12]} />
        <meshStandardMaterial color="#a39a91" metalness={0.8} />
      </mesh>
    </group>
  );
}

export default function Televisao3D({ channel, onNext }) {
  return (
    <SceneBoundary
      fallback={
        <button
          type="button"
          className="tv-fallback-v8"
          onClick={onNext}
          aria-label="Avançar canal da televisão"
        >
          <span>ARQUIVO / TV ELEITORAL</span>
          <b>{channel?.name}</b>
          <strong>{channel?.value}</strong>
          <small>{channel?.detail}</small>
          <em>TOQUE NA TELA PARA MUDAR O CANAL ↗</em>
        </button>
      }
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        shadows
        camera={{ position: [6.5, 4.6, 8.8], fov: 37 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.9} />
        <hemisphereLight args={['#fff0d2', '#504030', 1.1]} />
        <directionalLight position={[5, 9, 7]} intensity={2.9} castShadow />
        <Television channel={channel} onNext={onNext} />
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.98, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#dcccae" roughness={1} />
        </mesh>
        <ContactShadows frames={1} position={[0, -1.97, 0]} scale={11} blur={2} opacity={0.26} />
        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={13}
          minPolarAngle={0.7}
          maxPolarAngle={1.5}
          maxAzimuthAngle={0.55}
          minAzimuthAngle={-0.55}
          target={[0, 0.4, 0]}
        />
      </Canvas>
    </SceneBoundary>
  );
}
