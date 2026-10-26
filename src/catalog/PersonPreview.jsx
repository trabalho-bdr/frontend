import SearchSelect from './SearchSelect.jsx';
import {partyStyle} from './partyColors.js';
import PartyHistory from './PartyHistory.jsx';
import {useState} from 'react';
import {useCatalog,CatalogState,displayNumber as num,displayMoney as money} from './useCatalog.jsx';
import Portrait from './Portrait.jsx';
const resultText=value=>value==='ELEITO POR QP'?'Eleito por quociente partidário':value==='ELEITO POR MÉDIA'?'Eleito por média':value==='ELEITO'?'Eleito':value==='SUPLENTE'?'Suplente':['NÃO ELEITO','NAO ELEITO'].includes(value)?'Não eleito':value&&!value.startsWith('#')?value:'Resultado não informado';
export default function PersonPreview({person,onOpenProfile,onClose,initialElectionId}){
 const personId=person?.id_candidato;
 const [choice,setChoice]=useState(null),[tab,setTab]=useState('resumo');
 const selectedId=choice&&choice.personId===personId?choice.id:initialElectionId||person?.id;
 const state=useCatalog(personId?'pessoas/'+encodeURIComponent(personId):'pessoas',{candidatura:selectedId},!!personId);
 const data=state.data,current=data?.selecionada,rows=data?.candidaturas||[];
 const choose=id=>setChoice({personId,id});
 const name=person?.nome_pessoa||person?.nome;
 if(!person)return <div className="candidate-preview-empty"><h2>Conheça quem disputou.</h2><p>Selecione uma pessoa para consultar suas eleições, resultados e contas.</p></div>;
 return <>
  <button className="candidate-preview-back" onClick={onClose}>← Voltar aos resultados</button>
  <span className="candidate-preview-kicker">PESSOA SELECIONADA</span>
  <header className="candidate-preview-heading"><Portrait name={name} url={person.foto_url} photoYear={person.foto_ano} large/><div><h2>{name}</h2>{person.nome_civil&&person.nome_civil!==name&&<p>{person.nome_civil}</p>}<span>{num(person.participacoes)} {person.participacoes===1?'candidatura':'candidaturas'} no acervo · {person.primeiro_registro}{person.ultimo_registro!==person.primeiro_registro?'–'+person.ultimo_registro:''}</span></div></header>
  <CatalogState state={state}/>
  {current&&<>
   <div className="candidate-election-picker"><SearchSelect label="Eleição em leitura" value={current.id} onChange={choose} options={rows.map(row=>({value:row.id,label:row.ano+' · '+row.cargo+' · '+(row.municipio||row.uf)+' · '+(row.partido||'Sigla não informada')}))}/></div>
   <span className="party-identity" style={partyStyle(current.partido)}>{current.partido||'Sigla não informada'}</span><div className="candidate-election-context"><span>{current.municipio?current.municipio+' · ':''}{current.uf}</span><strong className={current.resultado?.startsWith('ELEITO')?'is-elected':'is-other'}>{resultText(current.resultado)}</strong></div>
   <PartyHistory sigla={current.partido} year={current.ano}/><div className="candidate-preview-tabs" role="group" aria-label="Informações da pessoa">{[['resumo','Visão geral'],['trajetoria','Trajetória'],['contas','Contas e patrimônio']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}</div>
   <div className="candidate-preview-content" key={current.id+':'+tab}>
   {tab==='resumo'&&<dl className="candidate-preview-facts">{[['Cargo',current.cargo],['Partido na eleição',current.partido],['Número de urna',current.numero],['Votos',num(current.votos)],['Escolaridade',current.escolaridade],['Idade na eleição',current.idade==null?'Não informada':num(current.idade)+' anos']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Não informado'}</dd></div>)}</dl>}
   {tab==='trajetoria'&&<div className="candidate-preview-history"><p>Escolha uma eleição para atualizar os dados deste painel.</p><ol>{rows.map(row=><li key={row.id}><button aria-pressed={current.id===row.id} onClick={()=>choose(row.id)}><b>{row.ano}</b><span>{row.cargo} · {row.partido||'Sigla não informada'}<small>{row.municipio||row.uf} · {resultText(row.resultado)}</small></span></button></li>)}</ol></div>}
   {tab==='contas'&&<div className="candidate-preview-accounts"><dl className="candidate-preview-facts"><div><dt>Despesa declarada · {current.ano}</dt><dd>{money(current.gastos)}</dd></div><div><dt>Patrimônio declarado · {current.ano}</dt><dd>{money(current.patrimonio)}</dd></div></dl><p>Valores da eleição selecionada, sem soma entre anos. O perfil completo apresenta os lançamentos e a comparação com a mesma disputa.</p></div>}
   <button className="candidate-profile-open" onClick={()=>onOpenProfile(current)}>Abrir perfil completo <span aria-hidden="true">→</span></button>
   <p className="candidate-preview-source">Fonte: acervo eleitoral do TSE. Cada resultado se refere à eleição em leitura.</p></div>
  </>}
 </>;
}

