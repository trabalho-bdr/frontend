import Chart1 from '../../features/questions/q01_custo_cadeira/Chart.jsx';
import Chart2 from '../../features/questions/q02_patrimonio_sucesso/Chart.jsx';
import Chart5 from '../../features/questions/q05_votos_legenda/Chart.jsx';
import Chart8 from '../../features/questions/q08_financiamento/Chart.jsx';
const charts = { 1: Chart1, 2: Chart2, 5: Chart5, 8: Chart8 };
export default function ResearchCharts({ question, ...props }) {
  const Chart = charts[question];
  return Chart && props.data?.rows?.length ? <Chart {...props} /> : null;
}
