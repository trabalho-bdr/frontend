import {sourceValue} from '../catalog/sourceValue.js';
import TrajectoryAlbum from '../components/exhibition/TrajectoryAlbum.jsx';

import {partyStyle} from '../catalog/partyColors.js';
import PartyHistory from '../catalog/PartyHistory.jsx';
import {useEffect,useState,useRef} from 'react';
import {useCatalog,CatalogState,candidateContext,displayNumber as num,displayMoney as money} from '../catalog/useCatalog.jsx';
import {writeContext} from '../data/investigationContext.js';
import Portrait from '../catalog/Portrait.jsx';
import RecordCollection from '../components/RecordCollection.jsx';
import '../catalog/catalog.css';
import '../catalog/people.css';

export default function PersonProfile({personId,candidateId,onGo,onOpenCampaign}){
 const [selected,setSelected]=useState(candidateId||'');
 const state=useCatalog(personId?'pessoas/'+encodeURIComponent(personId):'candidaturas/'+encodeURIComponent(selected||candidateId||''),personId?{candidatura:selected}:{},!!(personId||candidateId));
 const previousData=useRef(null);if(state.data)previousData.current=state.data;
 const data=state.data||previousData.current,current=data?.selecionada,rows=data?.candidaturas||[],summary=data?.resumo;
 // After resolving an older link that only carried a candidature, keep person identity in the URL.
 useEffect(()=>{if(current)writeContext(candidateContext(current))},[current?.id]);
 const choose=row=>{if(personId){setSelected(row.id);writeContext(candidateContext(row))}else{setSelected(row.id);writeContext(candidateContext(row))}};
 if(!data?.selecionada)return <section className="person-profile"><h1>Candidatos · perfil completo</h1>{!personId&&!candidateId?<p>Selecione uma candidatura no catálogo para abrir o perfil.</p>:<CatalogState state={state}/>}<button onClick={()=>onGo('candidatos')}>Voltar ao catálogo</button></section>;
 const expenseMax=Math.max(0,...data.despesas.map(row=>row.valor??0));
 const facts=[['Escolaridade da candidatura',current.escolaridade],['Idade na data da eleição',current.idade==null?null:num(current.idade)+' anos'],['Situação de registro',current.situacao_registro],['Ocupação no cadastro da pessoa',current.ocupacao],['Gênero no cadastro da pessoa',current.genero],['Raça/cor no cadastro da pessoa',current.raca]];
 const open=(page,story='')=>{
  const context=candidateContext(current);
  if(['plenario','partidos'].includes(page)&&!['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL'].includes(current.cargo)){
   context.cargo='VEREADOR';context.aviso=`A candidatura selecionada é de ${current.cargo}. Este ambiente investiga disputas proporcionais; foi aberto o recorte de vereador no território compatível.`;
  }
  if(page==='atlas'&&![2022,2024].includes(current.ano)){context.ano=2024;context.aviso=`A candidatura selecionada é de ${current.ano}. O Atlas de participação usa 2024, ano com dados territoriais disponíveis.`}
  onGo(page,story,'',context);
 };
 return <article className="person-profile">
 <button className="catalog-back" onClick={()=>onGo('candidatos')}>← Voltar a Candidatos</button>
 <header className="catalog-profile-heading"><Portrait key={current.id} name={current.nome} url={current.foto_url} photoYear={current.foto_ano} large/><div><span className="catalog-stamp">CANDIDATOS / PERFIL COMPLETO</span><h1>{data.pessoa.nome||data.pessoa.nome_civil}</h1>{data.pessoa.nome_civil&&data.pessoa.nome_civil!==data.pessoa.nome&&<p>{data.pessoa.nome_civil}</p>}<p>{summary.primeiro_ano}{summary.ultimo_ano!==summary.primeiro_ano?`–${summary.ultimo_ano}`:''} · {num(summary.candidaturas)} {summary.candidaturas===1?'candidatura':'candidaturas'} · {num(summary.vitorias)} {summary.vitorias===1?'vitória registrada':'vitórias registradas'}</p><small>Vitórias são resultados eleitorais observados, não comprovação de mandatos exercidos.</small></div></header>
 <nav className="people-profile-nav" aria-label="Seções do perfil">{[['perfil-trajetoria','Trajetória'],['perfil-eleicao','Dados da eleição'],['perfil-patrimonio','Patrimônio'],['perfil-despesas','Despesas']].map(([id,label])=><button key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({block:'start'})}>{label}</button>)}</nav>{rows.length>0&&<section className="catalog-profile-section" id="perfil-trajetoria"><div className="catalog-section-heading"><span>01 / TRAJETÓRIA</span><h2>Uma pessoa, diferentes eleições</h2><p>Escolha uma candidatura para abrir os dados daquela eleição. Não são preenchidos anos sem registro.</p></div>
 {state.loading&&<p role="status">Atualizando a eleição selecionada…</p>}<TrajectoryAlbum rows={rows} current={current} onChoose={choose} busy={state.loading}/>
 <p>{num(summary.partidos)} {summary.partidos===1?'sigla':'siglas'} e {num(summary.cargos)} {summary.cargos===1?'cargo observado':'cargos observados'}. {summary.anos_ate_primeira_vitoria!=null?`A primeira vitória registrada veio ${summary.anos_ate_primeira_vitoria} anos após a primeira candidatura do acervo.`:'Nenhuma vitória observada neste recorte.'} {summary.retornou_apos_derrota?'Há candidatura posterior a uma derrota ou suplência registrada.':'O acervo não registra retorno posterior a uma derrota ou suplência nesta trajetória.'}</p></section>}
 <section className="catalog-selected" id="perfil-eleicao"><span className="catalog-stamp">CANDIDATURA SELECIONADA</span><h2>{current.cargo} · {current.ano}</h2><span className="party-identity" style={partyStyle(current.partido)}>{current.partido||'Sigla não informada'}</span><p>{current.nome!==(data.pessoa.nome||data.pessoa.nome_civil)?current.nome+' · ':''}{current.partido||'Sigla não informada'} · {current.municipio||current.uf}</p><div className="catalog-results-pair"><div><span>Votos individuais</span><strong>{num(current.votos)}</strong></div><div><span>Resultado registrado</span><strong>{sourceValue(current.resultado)}</strong></div></div>
 <PartyHistory sigla={current.partido} year={current.ano}/><dl className="catalog-profile-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{sourceValue(value)}</dd></div>)}</dl><p className="catalog-method">A escolaridade e a situação de registro pertencem à candidatura. Ocupação, gênero e raça/cor vêm do cadastro da pessoa e não têm uma referência histórica por eleição nesta fonte.</p></section>
 <section className="catalog-profile-section" id="perfil-patrimonio"><div className="catalog-section-heading"><span>02 / PATRIMÔNIO</span><h2>O patrimônio declarado</h2></div><strong className="catalog-big-value">{money(current.patrimonio)}</strong><p>{current.patrimonio==null?'Não há patrimônio consolidado informado para esta candidatura.':'Valor consolidado da candidatura selecionada; zero, quando declarado, é diferente de ausência.'}</p><p>Os bens individuais não são exibidos porque a correspondência com a tabela de patrimônio item a item ainda não foi validada.</p>
 <details><summary>Patrimônio nas candidaturas observadas</summary><RecordCollection items={rows.map(row=>({id:row.id,title:`${row.ano} · ${row.cargo}`,value:money(row.patrimonio),subtitle:`${row.partido||'Sigla não informada'} · ${row.municipio||row.uf}`}))}/></details></section>
 <section className="catalog-profile-section" id="perfil-despesas"><div className="catalog-section-heading"><span>03 / DESPESAS DE CAMPANHA</span><h2>Os gastos desta candidatura</h2></div><strong className="catalog-big-value">{money(current.gastos)}</strong><p>Total declarado na candidatura. Os lançamentos por categoria podem ter cobertura diferente desse consolidado.</p><p>Na mesma eleição, cargo e território, há {num(data.comparacao.candidaturas)} candidaturas. A mediana dos gastos conhecidos é {money(data.comparacao.gasto_mediano)}, entre {num(data.comparacao.despesas_conhecidas)} registros com despesa informada.</p>
 <RecordCollection title="Categorias com maiores valores conhecidos · até 20 categorias" items={data.despesas.map(row=>({id:row.categoria,title:row.categoria||'Categoria não informada',value:money(row.valor),bar:{value:row.valor,max:expenseMax,label:money(row.valor)},fields:[{label:'Lançamentos',value:num(row.registros)}]}))}/>
 <button onClick={()=>onOpenCampaign(current)}>Abrir os lançamentos na Prestação de Contas ↗</button>
 <details><summary>Histórico financeiro das candidaturas</summary><RecordCollection items={rows.map(row=>({id:row.id,title:`${row.ano} · ${row.cargo}`,value:money(row.gastos),subtitle:`${row.partido||'Sigla não informada'} · ${row.municipio||row.uf}`}))}/><p>Valores nominais. Cargos, disputas e preços de anos diferentes não são equivalentes.</p></details></section>
 <nav className="catalog-related" aria-label="Investigações relacionadas a esta candidatura"><h2>Siga esta candidatura pelo arquivo</h2><button onClick={()=>onGo('legendas','','',candidateContext(current))}>Panorama do partido neste recorte ↗</button><button onClick={()=>open('plenario','custo')}>A disputa no Plenário ↗</button><button onClick={()=>open('atlas','territorio')}>O território no Atlas ↗</button><button onClick={()=>open('partidos','legenda')}>O partido no Mural ↗</button><button onClick={()=>open('adesivos')}>Despesas na Adesivaria ↗</button>{current.municipio_id&&<button onClick={()=>onGo('territorios','municipio','',candidateContext(current))}>Perfil eleitoral do município ↗</button>}</nav>
 <details className="catalog-method"><summary>Fontes, identidade e limites</summary><p>{data.identity}</p>{data.limitations.map(note=><p key={note}>{note}</p>)}<p>Consulta ao banco {data.database}. Cobertura: CE, MA, MS, RJ, RN e RS.</p></details>
 </article>;
}
