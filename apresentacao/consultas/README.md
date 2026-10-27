# Consultas e Instruções de Execução — Apresentação Arquivo da Democracia

Este diretório contém os scripts SQL e utilitários em Python para reproduzir e auditar as evidências apresentadas nas dez questões da pesquisa.

## Princípios de Segurança e Reprodutibilidade

- **Sem credenciais embutidas**: nenhum script contém tokens, chaves de API ou senhas.
- **Acesso somente em leitura**: as consultas realizam exclusivamente instruções `SELECT`.
- **Modos de execução**:
  1. **Via API Local (Recomendado)**: consulta os endpoints locais do FastAPI já em execução na porta `8000`.
  2. **Via Conexão DuckDB Local**: utiliza o arquivo de ambiente padrão `server/.env` em modo estritamente `READ_ONLY`.

---

## Como Executar

### Opção 1: Execução Automatizada via API Local (Mais Rápida e Segura)

Com o servidor rodando (`python server/run.py` na pasta `frontend`):

```powershell
python apresentacao/consultas/executar_consultas.py
```

O script testará os 10 endpoints, salvará as respostas em formato JSON formatado e validará numeradores e denominadores.

---

### Opção 2: Execução Direta no DuckDB / MotherDuck

Caso queira rodar consultas SQL parametrizadas isoladamente no terminal Python:

```powershell
python -c "
import sys; sys.path.insert(0, 'server')
from dotenv import load_dotenv; load_dotenv('server/.env')
from catalogo import read
sql = open('apresentacao/consultas/q01_custo.sql', encoding='utf-8').read()
print(read(sql))
"
```

---

## Índice dos Arquivos SQL

| Arquivo | Questão | Descrição do Cálculo |
| :--- | :--- | :--- |
| `q01_custo.sql` | Q01 | Despesas totais e dos eleitos por eleito e mediana individual por ano |
| `q02_patrimonio.sql` | Q02 | Taxa de sucesso eleitoral por decis de patrimônio com zero separado |
| `q03_territorio.sql` | Q03 | Cruzamento de IDHM e população com abstenção nos 1.236 municípios |
| `q04_escolaridade.sql` | Q04 | Comparação das distribuições de instrução entre candidatos e eleitorado (18+) |
| `q05_votos_legenda.sql` | Q05 | Razão de votos de legenda sobre válidos em pleitos proporcionais |
| `q06_eleitorado_jovem.sql` | Q06 | Proporção de jovens de 16 a 24 anos e correlação municipal |
| `q07_mudancas_partidarias.sql` | Q07 | Permanência de liderança partidária e volatilidade de Pedersen |
| `q08_financiamento.sql` | Q08 | Taxa de eleição por dependência de fundos públicos (prestação final) |
| `q09_publicidade.sql` | Q09 | Gastos por categorias de publicidade eleitoral e revisão textual |
| `q10_trajetorias.sql` | Q10 | Padrões de carreira eleitoral (única eleição, sequência e retorno) |
