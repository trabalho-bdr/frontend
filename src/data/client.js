import {overview as base, analyses, states} from './snapshot.js';
const API_TIMEOUT=12500;
export async function request(path,{signal,timeout=API_TIMEOUT}={}){
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),timeout);
  const cancel=()=>controller.abort();
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  try{const r=await fetch('/api'+path,{signal:controller.signal});if(!r.ok)throw new Error('API '+r.status);return await r.json();}
  finally{clearTimeout(t);signal?.removeEventListener('abort',cancel)}
}
export async function getHealth(){try{return await request('/health')}catch{return {connected:false,mode:'snapshot'}}}
export async function getOverview(){try{const live=await request('/overview');return {...base,...live.values,mode:'live'}}catch{return {...base,mode:'snapshot'}}}
export async function getAnalysis(id){try{return await request('/analysis/'+id)}catch{return null}}
export async function getCandidates(params={}){const q=new URLSearchParams(params);return request('/candidates?'+q.toString())}
export async function getCandidateExpenses(id,params={}){const q=new URLSearchParams(params);return request('/candidate-expenses/'+encodeURIComponent(id)+'?'+q.toString())}
export async function getMunicipios(params={}){const q=new URLSearchParams(params);return request('/municipios?'+q.toString())}
export {analyses,states};

export async function getDescobertas(params={}){const q=new URLSearchParams(params);return request('/descobertas?'+q.toString())}
export async function getAdesivaria(params={},options={}){const q=new URLSearchParams(params);return request('/adesivaria?'+q.toString(),{timeout:25000,...options})}
export async function getAdesivariaCandidate(id,params={},options={}){return request('/adesivaria/candidatura/'+encodeURIComponent(id)+'?'+new URLSearchParams(params),{timeout:25000,...options})}

/** Série comparativa: SQL pré-definido, somente leitura e parâmetros na API. */
export async function getComparison(kind, params={}){
  const allowed=['legenda','abstencao','cadeiras','escolaridade','propaganda','patrimonio'];
  if(!allowed.includes(kind))throw new Error('Comparador desconhecido');
  const q=new URLSearchParams(params);
  return request(`/comparacoes/${kind}?${q.toString()}`);
}

export async function getJuventudeOverview(params={}){
  const q=new URLSearchParams(params);
  return request('/questao6/overview?'+q.toString());
}

export async function getJuventudePartidos(params={}){
  const q=new URLSearchParams(params);
  return request('/questao6/partidos?'+q.toString());
}

export async function getJuventudeMunicipios(params={}){
  const q=new URLSearchParams(params);
  return request('/questao6/municipios?'+q.toString());
}

export async function getJuventudeEvolucao(params={}){
  const q=new URLSearchParams(params);
  return request('/questao6/evolucao?'+q.toString());
}

export async function getJuventudeCandidatos(params={}){
  const q=new URLSearchParams(params);
  return request('/questao6/candidatos?'+q.toString());
}
