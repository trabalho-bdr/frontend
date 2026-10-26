import reference from '../../../src/data/v4Reference.json' with {type:'json'};
const archive={municipios_br:reference.wealthMaps[''],municipios_por_uf:reference.wealthMaps,resumo_br:reference.wealthSummaries[''],resumos_uf:reference.wealthSummaries};
export function wealthFallback(kind,{ano=2024,cargo='VEREADOR',uf='',municipio=''}={}){
 const scope={ano:Number(ano),cargo,uf,municipio};const empty={...scope,source:'unavailable',municipios:[],ufs:[],resumo_situacao:[],decis:[],correlacao:{linear:null,log:null},cobertura:{total:null,validos:null,cobertura_pct:null}};
 if(Number(ano)!==2024||cargo!=='VEREADOR')return empty;
 const source={source:'snapshot',extracted_at:reference.extracted_at,database:reference.database};
 if(kind==='map'){const data=uf?archive.municipios_por_uf[uf]:archive.municipios_br;return data?{...data,...scope,...source}:empty}
 if(!municipio){const data=uf?archive.resumos_uf[uf]:archive.resumo_br;return data?{...data,...scope,...source}:empty}
 const m=archive.municipios_por_uf[uf]?.municipios.find(r=>String(r.id_municipio)===String(municipio));
 if(!m)return empty;
 return {...scope,...source,resumo_situacao:[{situacao:'eleito',candidaturas:m.eleitos,patrimonio_medio:null,patrimonio_mediano:m.patrimonio_mediano_eleitos},{situacao:'nao_eleito',candidaturas:m.analisadas-m.eleitos,patrimonio_medio:null,patrimonio_mediano:m.patrimonio_mediano_nao_eleitos}],decis:[],correlacao:{linear:null,log:null,candidaturas:m.analisadas},cobertura:{total:m.candidaturas,validos:m.analisadas,negativos:null,sem_resultado_definido:null,cobertura_pct:m.candidaturas?100*m.analisadas/m.candidaturas:null}};
}
