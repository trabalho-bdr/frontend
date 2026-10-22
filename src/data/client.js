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

export async function getQ3Municipios(uf, ano) {
  try {
    return await request(`/q3/${encodeURIComponent(uf)}/${encodeURIComponent(ano)}`);
  } catch (err) {
    return null;
  }
}

export async function getAnosQ3() {
  try {
    const res = await request('/anos');
    return res.anos || [2024, 2022];
  } catch {
    return [2024, 2022];
  }
}
import {patrimonioSnapshot} from './patrimonioSnapshot.js';

export async function getQ2Opcoes(){
  try{
    return await request('/q2/opcoes');
  }catch{
    return patrimonioSnapshot.opcoes;
  }
}

export async function getQ2Municipios({ano=2024,cargo='VEREADOR',uf=''}={}){
  try{
    const q=new URLSearchParams();
    if(ano)q.set('ano',String(ano));
    if(cargo)q.set('cargo',cargo);
    if(uf)q.set('uf',uf);
    return await request('/q2/municipios?'+q.toString());
  }catch{
    if(uf && patrimonioSnapshot.municipios_por_uf[uf]){
      return patrimonioSnapshot.municipios_por_uf[uf];
    }
    return patrimonioSnapshot.municipios_br;
  }
}

export async function getQ2Patrimonio({ano=2024,cargo='VEREADOR',uf='',municipio=''}={}){
  try{
    const q=new URLSearchParams();
    if(ano)q.set('ano',String(ano));
    if(cargo)q.set('cargo',cargo);
    if(uf)q.set('uf',uf);
    if(municipio)q.set('municipio',municipio);
    return await request('/q2/patrimonio?'+q.toString());
  }catch{
    if(!uf){
      return patrimonioSnapshot.resumo_br;
    }
    if(!municipio && patrimonioSnapshot.resumos_uf[uf]){
      return patrimonioSnapshot.resumos_uf[uf];
    }
    // Caso de município específico
    const muns = patrimonioSnapshot.municipios_por_uf[uf]?.municipios || [];
    const m = muns.find(x => x.id_municipio === municipio);
    if(m){
      return {
        ano, cargo, uf, municipio, ufs_cobertas: ['CE','MA','MS','RJ','RN','RS'],
        resumo_situacao: [
          {situacao: 'eleito', candidaturas: m.eleitos, patrimonio_medio: m.patrimonio_mediano_eleitos, patrimonio_mediano: m.patrimonio_mediano_eleitos},
          {situacao: 'nao_eleito', candidaturas: m.analisadas - m.eleitos, patrimonio_medio: m.patrimonio_mediano_nao_eleitos, patrimonio_mediano: m.patrimonio_mediano_nao_eleitos}
        ],
        correlacao: {linear: null, log: null, candidaturas: m.analisadas},
        decis: [],
        cobertura: {total: m.candidaturas, validos: m.analisadas, negativos: 0, sem_resultado_definido: 0, cobertura_pct: 100.0 * m.analisadas / m.candidaturas}
      };
    }
    return patrimonioSnapshot.resumos_uf[uf] || patrimonioSnapshot.resumo_br;
  }
}
