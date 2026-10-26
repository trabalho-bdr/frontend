import Portrait from '../catalog/Portrait.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import SceneBoundary from './SceneBoundary.jsx';

// Constantes editoriais do Arquivo da Democracia
const CREAM='#f5e8c9', INK='#173b71', RED='#bf4738', GOLD='#ecc454';
const fmt=n=>n==null?'Não informado':Number(n).toLocaleString('pt-BR');
const money=n=>n==null?'Não informado':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const safe=s=>String(s??'—');

// Funções de apoio e legado para Three.js
function canvasTexture(draw,width=1200,height=1600){
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const x=c.getContext('2d');draw(x,width,height);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

function labelTexture(title,color=INK){return canvasTexture((c,w,h)=>{
 c.fillStyle='#f2e7cf';c.fillRect(0,0,w,h);c.strokeStyle=color;c.lineWidth=28;c.strokeRect(14,14,w-28,h-28);
 c.fillStyle=color;c.font='900 190px Arial';c.textAlign='center';c.textBaseline='middle';
 const t=safe(title).slice(0,11).toUpperCase();
 c.font=`900 ${t.length>9?135:t.length>6?165:215}px Arial`;c.fillText(t,w/2,h/2,w-80);
 },800,360)}

function textLines(ctx,text,x,y,maxWidth,size=105,color=INK,lineHeight=1.05,maxLines=3){
 ctx.font=`900 ${size}px 'Arial Narrow',Arial,sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;
 const words=safe(text).toUpperCase().split(/\s+/),lines=[];let current='';
 for(const word of words){const candidate=(current+' '+word).trim();if(ctx.measureText(candidate).width>maxWidth&&current){lines.push(current);current=word}else current=candidate}
 if(current)lines.push(current);lines.slice(0,maxLines).forEach((line,i)=>ctx.fillText(line,x,y+i*size*lineHeight,maxWidth));
 return y+Math.min(lines.length,maxLines)*size*lineHeight;
}

export function createCandidateTexture(candidate,back=false){return canvasTexture((c,w,h)=>{
 c.fillStyle='#fff0d3';c.fillRect(0,0,w,h);
 c.strokeStyle='#a89472';c.lineWidth=12;c.strokeRect(22,22,w-44,h-44);
 c.fillStyle=INK;c.fillRect(40,40,w-80,210);
 c.textAlign='center';c.fillStyle='#fff4da';c.font='900 52px Arial';c.fillText(back?'DOSSIÊ ELEITORAL / VERSO':'ARQUIVO DA DEMOCRACIA',w/2,125);
 c.fillStyle=GOLD;c.font='700 42px monospace';c.fillText(`${safe(candidate?.ano)}  ·  ${safe(candidate?.uf)}  ·  ${safe(candidate?.cargo)}`.slice(0,45),w/2,198,w-120);
 if(!back){
   c.fillStyle=RED;c.font='900 220px Arial';c.fillText(safe(candidate?.numero),w/2,1100,1050);
   textLines(c,candidate?.nome,w/2,1225,1050,105,INK,1.05,2);
   c.fillText(`${safe(candidate?.partido)}  ·  ${safe(candidate?.resultado)}`,w/2,1475);
 }else{
   c.fillText(safe(candidate?.nome),105,360);
   c.fillText(`${safe(candidate?.numero)} · ${safe(candidate?.partido)}`,105,500);
   c.fillText(fmt(candidate?.votos),105,640);
   c.fillText(money(candidate?.gastos),105,780);
   c.fillText(money(candidate?.patrimonio),105,920);
 }
 })}

export function Block({position,args,color,metalness=0,roughness=.77,onClick}){
 return <mesh position={position} onClick={onClick} castShadow receiveShadow><boxGeometry args={args}/><meshStandardMaterial color={color} roughness={roughness} metalness={metalness}/></mesh>;
}

export function IndexDivider({entry,i,count,selected,onChoose}){
 const z=1.32-i*(3.15/Math.max(count-1,1));
 const tex=useMemo(()=>labelTexture(entry?.short||entry?.label,entry?.color||INK),[entry?.short,entry?.label,entry?.color]);
 useEffect(()=>()=>tex.dispose(),[tex]);
 return <group position={[-1.75,0,z]} onClick={e=>{e.stopPropagation();onChoose(entry?.id)}}><Block position={[0,1.4,0]} args={[4.5,2.22,.055]} color={selected?'#fce7b8':'#e7d8b9'}/></group>;
}

export function RowCard({i,count,selected,onPull,color}){
 return <group position={[-1.75,0,1.64-i*.24]} onClick={e=>{e.stopPropagation();onPull('',i)}}><Block args={[4.06,2.18,.075]} position={[0,1.35,0]} color={selected?'#fff3d5':'#f0e1c0'}/></group>;
}

export function Extracted({candidate,flipped,onFlip}){
 const root=useRef();
 useFrame((_,dt)=>{
  if(root.current){root.current.rotation.y=flipped?Math.PI:0;}
 });
 return <group ref={root} position={[-1.75,1.25,1]} onClick={e=>{e.stopPropagation();onFlip()}}><Block position={[0,0,0]} args={[2.87,3.91,.07]} color="#d0b792"/></group>;
}

export function CameraRig({drawers,activeDrawer,selectedFile,onChoose,onPull,fileCount,candidate,flipped,onFlip,phase}){
 const orbit=useRef();
 return <>
  <Canvas dpr={[1,1.5]}><OrbitControls ref={orbit} makeDefault/></Canvas>
 </>;
}

// Fichário Tátil Nativo — Dossiê em Papel e Santinho Eleitoral com Flip em 3D Real (CSS)
export default function Arquivo3D({
  drawers = [],
  activeDrawer = '',
  selectedFile = -1,
  onChoose = () => {},
  onPull = () => {},
  fileCount = 0,
  phase = 'pronta',
  candidate = null,
  flipped = false,
  onFlip = () => {},
  onClose = () => {},
  onCompare = () => {},
  showCompare = true,
  onExpenses = () => {}
}) {
  return (
    <div className="index-3d-stage">
      <div className="tactile-fichario-stage">
        {/* Divisórias do fichário no topo da mesa */}
        <div className="tactile-tabs-shelf" role="tablist" aria-label="Divisórias do fichário">
          {drawers.slice(0, 8).map((entry) => {
            const isActive = activeDrawer === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`tactile-tab-btn ${isActive ? 'active' : ''}`}
                style={{ '--folder-tone': entry.color || '#c85542' }}
                onClick={() => onChoose(entry.id)}
                title={`Divisória: ${entry.label}`}
              >
                {entry.short || entry.label}
              </button>
            );
          })}
        </div>

        {/* Palco central com a Ficha / Dossiê */}
        <div className="tactile-card-stage">
          {candidate ? (
            <div
              className={`tactile-card-shell ${flipped ? 'is-flipped' : ''}`}
              onClick={onFlip}
              title="Clique para virar a ficha (frente / verso)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); } }}
              aria-label={`Dossiê de ${candidate.nome}. Pressione espaço ou clique para virar a folha.`}
            >
              {/* FRENTE: Santinho do Acervo */}
              <article className="tactile-face tactile-face-front">
                <header style={{ borderBottom: '3px double #173e78', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'monospace', color: '#173e78', letterSpacing: '0.08em' }}>
                      ARQUIVO DA DEMOCRACIA
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', color: '#bf4738', background: '#ffe4dd', padding: '2px 6px', borderRadius: '2px' }}>
                      ACERVO ELEITORAL
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#88622c', fontFamily: 'monospace', fontWeight: 700, marginTop: '4px' }}>
                    {safe(candidate.ano)} · {safe(candidate.uf)} · {safe(candidate.cargo)}
                  </div>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: 'auto 0', gap: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#9c382b', background: '#ffdcd6', border: '1px dashed #bf4738', padding: '3px 8px', letterSpacing: '0.05em' }}>
                    SANTINHO DO ACERVO · NÃO É PROPAGANDA OFICIAL
                  </span>

                  <div className="filing-official-photo"><Portrait name={candidate.nome} url={candidate.foto_url} photoYear={candidate.foto_ano}/></div>
                  <small className="filing-number-label">NÚMERO NA ELEIÇÃO</small>
                  <div style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#bf4738', lineHeight: 0.9, letterSpacing: '-0.04em', textShadow: '1px 2px 0 #fff' }}>
                    {safe(candidate.numero)}
                  </div>

                  {/* Nome da Urna */}
                  <h3 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: '#173e78', margin: '2px 0 4px', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    {safe(candidate.nome)}
                  </h3>

                  {/* Tarja do partido e resultado */}
                  <div style={{ background: '#173e78', color: '#fff5df', fontSize: '12px', fontWeight: 800, padding: '5px 14px', borderRadius: '3px', letterSpacing: '0.03em' }}>
                    {safe(candidate.partido)} · {safe(candidate.resultado)}
                  </div>
                </div>

                <footer style={{ borderTop: '1px dashed #ba9f7f', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'monospace', color: '#6e5a42' }}>
                  <span>{candidate.municipio ? `${candidate.municipio} / ${candidate.uf}` : candidate.uf}</span>
                  <span style={{ color: '#bf4738', fontWeight: 800 }}>TOQUE PARA VIRAR ↻</span>
                </footer>
              </article>

              {/* VERSO: Dossiê Detalhado com Dados Reais do Acervo */}
              <article className="tactile-face tactile-face-back">
                <header style={{ borderBottom: '3px double #173e78', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'monospace', color: '#173e78', letterSpacing: '0.08em', display: 'block' }}>
                      DOSSIÊ ELEITORAL / VERSO
                    </span>
                    <small style={{ fontSize: '9px', color: '#88622c', fontFamily: 'monospace' }}>REGISTRO OFICIAL NO ACERVO</small>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', color: '#173e78', background: '#ece1ce', padding: '3px 7px', border: '1px solid #c2b197' }}>
                    {safe(candidate.ano)}
                  </span>
                </header>

                <div style={{ display: 'grid', gap: '5px', margin: 'auto 0', fontSize: '11px' }}>
                  <div style={{ background: '#f5ecd8', padding: '5px 8px', borderRadius: '2px' }}>
                    <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>CANDIDATURA</small>
                    <strong style={{ color: '#173e78', fontSize: '13px' }}>{safe(candidate.nome)}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    <div style={{ background: '#fff', border: '1px solid #e0d3bc', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>NÚMERO / PARTIDO</small>
                      <strong style={{ color: '#173e78' }}>{safe(candidate.numero)} · {safe(candidate.partido)}</strong>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e0d3bc', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>TERRITÓRIO</small>
                      <strong style={{ color: '#173e78' }}>{safe(candidate.municipio || candidate.uf)} / {safe(candidate.uf)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    <div style={{ background: '#f5ecd8', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>VOTOS NOMINAIS</small>
                      <strong style={{ color: '#173e78', fontSize: '13px' }}>{fmt(candidate.votos)}</strong>
                    </div>
                    <div style={{ background: '#f5ecd8', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>RESULTADO</small>
                      <strong style={{ color: '#173e78' }}>{safe(candidate.resultado)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    <div style={{ background: '#fff', border: '1px solid #e0d3bc', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>DESPESAS DECLARADAS</small>
                      <strong style={{ color: '#173e78' }}>{money(candidate.gastos)}</strong>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e0d3bc', padding: '5px 8px', borderRadius: '2px' }}>
                      <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>PATRIMÔNIO DECLARADO</small>
                      <strong style={{ color: '#173e78' }}>{money(candidate.patrimonio)}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#f5ecd8', padding: '5px 8px', borderRadius: '2px' }}>
                    <small style={{ color: '#bf4738', fontSize: '9px', fontWeight: 800, display: 'block', fontFamily: 'monospace' }}>ESCOLARIDADE</small>
                    <strong style={{ color: '#173e78' }}>{safe(candidate.escolaridade || 'Não informada')}</strong>
                  </div>
                </div>

                <footer style={{ borderTop: '1px dashed #ba9f7f', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontFamily: 'monospace', color: '#6e5a42' }}>
                  <span>FONTE: BASE OFICIAL DE DADOS ELEITORAIS</span>
                  <span style={{ color: '#bf4738', fontWeight: 800 }}>VOLTAR À FRENTE ↻</span>
                </footer>
              </article>
            </div>
          ) : (
            <div className="tactile-empty-desk">
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🗂️</div>
              <strong style={{ fontSize: '18px', color: '#173e78', display: 'block', marginBottom: '6px' }}>
                Fichário do Acervo Aberto
              </strong>
              <p style={{ fontSize: '12px', color: '#5b4731', lineHeight: 1.5, margin: '0 0 14px' }}>
                Selecione qualquer candidatura no índice ao lado ou clique nas divisórias acima para puxar o santinho eleitoral.
              </p>
              <span style={{ display: 'inline-block', fontSize: '10px', fontFamily: 'monospace', color: '#9c382b', background: '#ffe9e4', padding: '4px 8px', borderRadius: '3px' }}>
                CONSULTA DIRETA AO ACERVO
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ações da ficha no rodapé */}
      {candidate && (
        <div className="index-scene-actions">
          <span>FICHA RETIRADA · {candidate.nome}</span>
          <button type="button" onClick={onFlip}>↻ VIRAR</button>
          {showCompare&&<button type="button" onClick={onCompare}>+ COMPARAR</button>}
          <button type="button" onClick={onExpenses}>VER DESPESAS ↗</button>
          <button type="button" onClick={onClose} aria-label="Guardar ficha">✕</button>
        </div>
      )}
    </div>
  );
}
