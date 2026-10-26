import {lazy,Suspense} from 'react';
import ResearchPage from './ResearchPage.jsx';
import {Explore} from '../components/exhibition/Story.jsx';
import SpendingStory from '../components/exhibition/SpendingStory.jsx';
import './money-section.css';
const Materials=lazy(()=>import('./Adesivaria.jsx'));
const Profiles=lazy(()=>import('../components/questao1/CostInvestigation.jsx'));
const threads=[['custo','O custo de uma cadeira','Como o gasto muda entre eleições',1],['patrimonio','Patrimônio e eleição','Quem disputa e quem consegue se eleger',2],['financiamento','A origem dos recursos','Fundos públicos, outros recursos e resultado',8],['publicidade','O dinheiro vira campanha','Onde a publicidade concentra os gastos',9]];
export default function MoneySection({story,onGo,mode,onResearch,onOpenCandidate,onOpenRecord}){
 const active=threads.find(row=>row[0]===story)||threads[0];
 return <section className="money-section"><header className="money-section-heading"><span>DINHEIRO E PODER</span><h1>Entre recursos e resultados.</h1><p>Acompanhe o dinheiro: quanto custa disputar, quem chega com patrimônio, de onde vêm os recursos e em que a campanha investe.</p></header><nav className="money-threads" aria-label="Explorações de Dinheiro e poder">{threads.map(([id,label,note])=><button key={id} aria-current={active[0]===id?'page':undefined} onClick={()=>onGo('campanhas',id,'dinheiro')}><strong>{label}</strong><span>{note}</span></button>)}</nav>
 <ResearchPage key={active[0]} question={active[3]} onGo={onGo} embedded/>
 {active[0]==='publicidade'&&<Explore title="Adesivaria · investigar materiais e candidaturas"><p>Confira adesivos, santinhos e bandeiras, seus lançamentos e as candidaturas associadas.</p><Suspense fallback={<p role="status">Abrindo os materiais de campanha…</p>}><Materials materialsOnly mode={mode} onResearch={onResearch} onOpenCandidate={onOpenCandidate} onOpenRecord={onOpenRecord}/></Suspense></Explore>}
 {active[0]==='custo'&&<><Explore title="Gasto e eleição · comparar taxas de sucesso"><SpendingStory onGo={onGo}/></Explore><Explore title="Aprofundar por estado, partido e perfil"><Suspense fallback={<p role="status">Abrindo comparações por perfil…</p>}><Profiles onGo={onGo} onOpenRecord={onOpenRecord}/></Suspense></Explore></>}
 <div className="research-actions"><button onClick={()=>onGo('campanhas','candidatura','dinheiro',{candidaturaId:'',pessoaId:''})}>Conferir lançamentos de uma campanha →</button></div>
 </section>;
}
