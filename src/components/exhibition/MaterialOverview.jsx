import {brl,fmt} from '../../data/exhibition.js';

const names=['Adesivos','Santinhos','Bandeiras'];
const compact=value=>value>=1e9?`R$ ${fmt(value/1e9,1)} bilhão${value>=2e9?'s':''}`:value>=1e6?`R$ ${fmt(value/1e6,1)} milhões`:value>=1e3?`R$ ${fmt(value/1e3,1)} mil`:brl(value);

export default function MaterialOverview({data,caption,busy,error,waiting,retry}){
 const rows=names.map(nome=>({nome,valor:data?.groups?.find(item=>item.tipo===nome)?.valor??null}));
 const known=rows.filter(row=>row.valor!=null&&row.valor!==''&&Number.isFinite(Number(row.valor))&&Number(row.valor)>=0).map(row=>({...row,valor:Number(row.valor)}));
 const maximum=Math.max(0,...known.map(row=>row.valor));
 const leaders=known.filter(row=>row.valor===maximum);
 const complete=known.length===3;
 const answer=!data?busy?'Conferindo os valores declarados…':waiting?'Escolha um município para consultar os materiais.':error?'Não foi possível consultar este recorte.':'Valores ainda indisponíveis.':!known.length?'Não há valores informados para comparar estes materiais neste recorte.':!complete?'A comparação está parcial: nem todos os materiais têm valor informado.':leaders.length>1?`${leaders.map(row=>row.nome).join(' e ')} empataram no maior valor declarado neste recorte.`:`${leaders[0].nome} receberam o maior valor declarado entre os três materiais neste recorte.`;
 return <section className="expo-story expo-material-overview" aria-labelledby="material-question"><header className="expo-lead"><span className="expo-kicker">CONTAS DE PROPAGANDA</span><h2 id="material-question">Qual material recebeu mais dinheiro?</h2><p className="expo-discovery">{answer}</p></header><p className="expo-reading-scope">Recorte: {caption}</p>
 {data&&<><div className="expo-material-bars" role="img" aria-label={rows.map(row=>`${row.nome}: ${row.valor==null?'valor não informado':brl(row.valor)}`).join('; ')}>{rows.map(row=><div className="expo-material-row" key={row.nome}><strong>{row.nome}</strong><div className="expo-material-track"><span style={{width:row.valor!=null&&maximum>0?`${100*row.valor/maximum}%`:'0%'}}/></div><b>{row.valor==null?'Não informado':compact(row.valor)}</b></div>)}</div><p className="expo-material-explain">Os valores somam lançamentos classificados como adesivos, santinhos ou bandeiras. Veja a quantia exata e os critérios em “Explorar mais”.</p><p className="expo-source">Fonte: despesas eleitorais declaradas · {data.partial||data.source==='amostra'?'amostra parcial':'consulta do recorte'}. Valores nominais; apenas os três materiais classificados.</p></>}
 {!data&&error&&<button type="button" onClick={retry}>Tentar novamente</button>}</section>;
}
