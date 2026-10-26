"""Gera SQL DuckDB/MotherDuck e CSVs de revisão a partir de JSON ou NDJSON.
Uso: python gerar_normalizacao.py /caminho/export.json --saida ./resultado
A geração usa apenas a biblioteca padrão; não se conecta ao banco.
"""
import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path

# codigo, grupo, modalidade sugerida, publicidade sugerida (None = indefinida),
# expressão inclusiva e exclusão. Grupos são analíticos, não códigos oficiais TSE.
RULES = [
 ('DIGITAL_PAGO','Publicidade digital paga','Impulsionamento e mídia paga',True,r'\b(IMPULSIONAMENTOS?|TRAFEGO PAGO|ANUNCIOS? PATROCINADOS?)\b',None),
 ('IMPRESSOS','Materiais impressos','Impressos de campanha',True,r'\b(SANTINHOS?|SANTOES|SANTAO|COLINHAS?|FOLDERS?|FOLHETOS?|PANFLETOS?|CARTAZES?|CARTAZ|INFORMATIVOS?|MATERIA(IS|L) (GRAFICO(S)?|IMPRESSO(S)?))\b|^IMPRESSOS?$',None),
 ('ADESIVOS','Adesivos e botons','Adesivos e botons',True,r'\b(ADESIVOS?|PRAGUINHAS?|BOTONS?|BOTTONS?|BOTON|BOTTON|PERFURADOS?|MICROPERFURADOS?|PERFURITE)\b',None),
 ('VISUAIS','Bandeiras, faixas e banners','Bandeiras, faixas e banners',True,r'\b(BANDEIRAS?|FAIXAS?|BANNERS?|WINDBANNERS?|WIND BANNERS?)\b',None),
 ('AUDIOVISUAL','Produção audiovisual','Produção de áudio, vídeo e fotografia',True,r'\b(AUDIOVISUA(L|IS)|VIDEOS?|JINGLES?|FILMAGEM|CINEGRAFISTAS?|FOTOGRAF(IA|IAS|ICO|ICOS|O|OS|A|AS))\b|\bPRODUCAO\b.*\b(RADIO|TV|TELEVISAO|PROGRAMAS?)\b',None),
 ('CARRO_SOM','Carro de som e sonorização de propaganda','Carro de som',True,r'\b(CARROS? DE SOM|VEICULOS? DE SOM|BICICLETAS? DE SOM|PROPAGANDA VOLANTE)\b',None),
 ('VEICULACAO','Veiculação em rádio, TV e imprensa','Veiculação em meios de comunicação',True,r'\b(VEICULACAO|ANUNCIOS?|INSERCOES)\b.*\b(RADIO|TV|TELEVISAO|JORNAL|JORNAIS|REVISTAS?|IMPRENSA)\b',None),
 ('PUBLICIDADE_GERAL','Publicidade e marketing sem modalidade definida','Publicidade sem modalidade definida',True,r'\b(PUBLICIDADE|PROPAGANDA|MARKETING)\b',r'\b(IMPULSIONAMENTOS?|TRAFEGO PAGO|SANTINHOS?|SANTAO|SANTOES|COLINHAS?|FOLDERS?|FOLHETOS?|PANFLETOS?|CARTAZES?|ADESIVOS?|PRAGUINHAS?|BOTONS?|BOTTONS?|BANDEIRAS?|BANNERS?|WINDBANNERS?|VIDEOS?|JINGLES?|AUDIOVISUA(L|IS)|CARROS? DE SOM|VEICULACAO)\b'),
 ('REDES_DIGITAIS','Redes sociais e conteúdo digital',None,None,r'\b(REDES? SOCIA(IS|L)|MIDIAS? SOCIA(IS|L)|SOCIAL MEDIA|FACEBOOK|INSTAGRAM|GOOGLE|SITES?|INTERNET)\b',r'\b(IMPULSIONAMENTOS?|TRAFEGO PAGO|ANUNCIOS? PATROCINADOS?)\b'),
 ('MOBILIZACAO','Mobilização, militância e panfletagem',None,None,r'\b(MILITAN(CIA|CIAS|TES?|TE)|MOBILIZA(CAO|COES)|CABOS? ELEITORA(IS|L)|ATIVISTAS?|PANFLETAGEM|PANFLETEIR(O|OS|A|AS)|PANFLETISTAS?|BANDEIRISTAS?)\b',None),
 ('JURIDICO','Serviços jurídicos',None,False,r'\b(ADVOC[A-Z]*|ADVOG[A-Z]*|JURIDIC[A-Z]*)\b',None),
 ('CONTABIL','Serviços contábeis',None,False,r'\b(CONTAB[A-Z]*|CONTADOR(ES|AS|A)?)\b',None),
 ('COMBUSTIVEL','Combustíveis',None,False,r'\b(GASOLINA|DIESEL|ETANOL|COMBUSTIVE(L|IS))\b',None),
 ('VEICULOS','Locação de veículos e transporte',None,False,r'\b(LOCACAO|ALUGUEL|CESSAO|FRETAMENTO)\b.*\b(VEICULOS?|CARROS?|VANS?|ONIBUS|MICROONIBUS|AERONAVES?|HELICOPTEROS?|AVIAO|CAMINHAO|MOTOCICLETAS?)\b|\b(PASSAGENS|TRANSPORTE DE PESSOAL|SERVICOS DE TRANSPORTE)\b',r'\b(CARROS? DE SOM|VEICULOS? DE SOM)\b'),
 ('MOTORISTAS','Serviços de motorista',None,False,r'\bMOTORISTAS?\b',None),
 ('PESSOAL','Pessoal administrativo e coordenação',None,False,r'\b(COORDEN[A-Z]*|ASSISTENTES?|ADMINISTRADOR(ES|AS|A)?|GERENTES?|SECRETARI(O|OS|A|AS)|DESPESAS? COM PESSOAL|LIDER(ES)? DE EQUIPE|ATENDENTES?)\b',None),
 ('IMOVEIS','Locação de imóveis e espaços',None,False,r'\b(LOCACAO|ALUGUEL|CESSAO)\b.*\b(IMOVEL|IMOVEIS|ESPACOS?|SALAS?|SEDE|COMITE)\b',None),
 ('ALIMENTACAO','Alimentação e bebidas',None,False,r'\b(ALIMENTACAO|REFEICOES|REFEICAO|MARMIT(EX|AS|A)|LANCHES?|REFRIGERANTES?|BEBIDAS?|AGUA MINERAL)\b',None),
 ('PESQUISAS','Pesquisas eleitorais e de opinião',None,False,r'\b(PESQUISAS?|SONDAGEM|SONDAGENS)\b',None),
 ('EVENTOS','Eventos e estrutura',None,None,r'\b(COMICIOS?|CARREATAS?|EVENTOS?|PALCOS?|TENDAS?|ILUMINACAO|SONORIZACAO|ESTRUTURA DE SOM)\b',r'\b(CARROS? DE SOM|VEICULOS? DE SOM)\b'),
 ('POSTAIS','Correspondência e serviços postais',None,None,r'\b(CORREIOS|POSTAIS|MALA DIRETA)\b',None),
 ('TELEFONIA','Telefonia e conectividade',None,False,r'\b(TELEFONIA|TELEFONES?|LINHAS? TELEFONICAS?|DADOS MOVEIS|BANDA LARGA)\b',None),
 ('TRIBUTOS','Tributos e tarifas',None,False,r'\b(TARIFAS?|TAXAS?|IMPOSTOS?|IRRF|INSS|ISSQN|ENCARGOS SOCIAIS)\b',None),
 ('EQUIPAMENTOS','Equipamentos e materiais de apoio',None,False,r'\b(COMPUTADORES?|NOTEBOOKS?|IMPRESSORAS?|AR CONDICIONADO|MATERIAL DE ESCRITORIO|MATERIAIS DE ESCRITORIO)\b',None),
 ('VESTUARIO','Vestuário e acessórios',None,None,r'\b(CAMISETAS?|CAMISAS?|BONES?|COLETES?)\b',None),
 ('COMUNICACAO','Comunicação sem especificação',None,None,r'\bCOMUNICACAO\b',r'\b(MARKETING|PUBLICIDADE|PROPAGANDA|IMPULSIONAMENTOS?|VIDEOS?|AUDIOVISUA(L|IS)|RADIO|TV|TELEVISAO)\b'),
 ('GENERICO','Serviços ou documentos sem especificação',None,None,r'^(CONTRATO|ADITIVO CONTRATUAL|CONTRATO DE PRESTACAO DE SERVICOS?|PRESTACAO DE SERVICOS?|SERVICOS? PRESTADOS?|HONORARIOS|SERVICOS? DE CAMPANHA|SERVICOS? ELEITORAIS|DIVULGACAO|APOIO NA CAMPANHA ELEITORAL|ATIVIDADES POLITICAS EM GERAL)$',None),
]
ALIASES = []
def alias(code, label, *keys):
 for key in keys: ALIASES.append((key,label,code))
alias('DIGITAL_PAGO','Impulsionamento de conteúdo','IMPULSIONAMENTO','IMPULSIONAMENTO DE CONTEUDO','IMPULSIONAMENTO DE CONTEUDOS','DESPESA COM IMPULSIONAMENTO','CREDITO DE IMPULSIONAMENTO','SERVICO DE IMPULSIONAMENTO')
alias('DIGITAL_PAGO','Impulsionamento no Facebook','IMPULSIONAMENTO FACEBOOK','IMPULSIONAMENTO DE FACEBOOK','IMPULSIONAMENTO NO FACEBOOK','IMPULSIONAMENTO DE REDE FACEBOOK')
alias('DIGITAL_PAGO','Impulsionamento no Google','IMPULSIONAMENTO GOOGLE')
alias('DIGITAL_PAGO','Impulsionamento em redes sociais','IMPULSIONAMENTO REDES SOCIAIS','SERVICOS DE IMPULSIONAMENTO EM REDE SOCIAL')
alias('IMPRESSOS','Santinhos','SANTINHO','SANTINHOS')
alias('IMPRESSOS','Santões','SANTAO','SANTOES')
alias('IMPRESSOS','Folders','FOLDER','FOLDERS')
alias('IMPRESSOS','Folhetos e panfletos','FOLHETO','FOLHETOS','PANFLETO','PANFLETOS')
alias('IMPRESSOS','Colinhas','COLINHA','COLINHAS')
alias('IMPRESSOS','Cartazes','CARTAZ','CARTAZES')
alias('IMPRESSOS','Informativos','INFORMATIVO','INFORMATIVOS')
alias('IMPRESSOS','Material gráfico impresso','MATERIAL GRAFICO','MATERIAL IMPRESSO','MATERIAIS IMPRESSOS','IMPRESSOS','MATL IMPRESSO')
alias('ADESIVOS','Adesivos','ADESIVO','ADESIVOS','ADESIVO VINIL','PRAGUINHA','PRAGUINHAS')
alias('ADESIVOS','Adesivos perfurados','ADESIVO PERFURADO','ADESIVOS PERFURADOS','ADESIVO MICROPERFURADO','PERFURADO','PERFURADOS')
alias('ADESIVOS','Botons','BOTON','BOTONS','BOTTON','BOTTONS')
alias('VISUAIS','Bandeiras','BANDEIRA','BANDEIRAS','BANDEIRA FIXA')
alias('VISUAIS','Banners','BANNER','BANNERS','WIND BANNER','WINDBANNER')
alias('JURIDICO','Serviços advocatícios','SERVICOS ADVOCATICIOS','PRESTACAO DE SERVICOS ADVOCATICIOS','HONORARIOS ADVOCATICIOS','SERVICOS DE ADVOCACIA')
alias('JURIDICO','Assessoria e consultoria jurídica','ASSESSORIA JURIDICA','CONSULTORIA JURIDICA','SERVICOS JURIDICOS')
alias('CONTABIL','Serviços contábeis','SERVICOS CONTABEIS','PRESTACAO DE SERVICOS CONTABEIS','ASSESSORIA CONTABIL','HONORARIOS CONTABEIS','SERVICOS DE CONTABILIDADE')
alias('COMBUSTIVEL','Gasolina comum','GASOLINA COMUM','GASOLINA C COMUM','GASOLINA COMUN')
alias('COMBUSTIVEL','Gasolina','GASOLINA')
alias('COMBUSTIVEL','Gasolina aditivada','GASOLINA ADITIVADA')
alias('COMBUSTIVEL','Óleo diesel','DIESEL','OLEO DIESEL')
alias('COMBUSTIVEL','Diesel S10','DIESEL S10','OLEO DIESEL S10','OLEO DIESEL B S10')
alias('COMBUSTIVEL','Combustíveis sem especificação','COMBUSTIVEL','COMBUSTIVEIS')
alias('MOBILIZACAO','Cabo eleitoral','CABO ELEITORAL','SERVICOS DE CABO ELEITORAL','SERVICO DE CABO ELEITORAL')
alias('MOBILIZACAO','Militância e mobilização de rua','MILITANCIA','MILITANTE','MILITANCIA DE RUA','MILITANCIA E MOBILIZACAO DE RUA','ATIVIDADE DE MILITANCIA','ATIVIDADES DE MILITANCIA','ATIVIDADE DE MILITANCIA E MOBILIZACAO DE RUA','ATIVIDADES DE MILITANCIA E MOBILIZACAO DE RUA','SERVICO DE MILITANCIA','SERVICOS DE MILITANCIA','MOBILIZACAO DE RUA','ATIVIDADE DE MOBILIZACAO DE RUA','SERVICOS DE MOBILIZACAO DE RUA')
alias('MOBILIZACAO','Panfletagem','PANFLETAGEM','SERVICOS DE PANFLETAGEM','SERVICO DE PANFLETAGEM','PANFLETEIRO','PANFLETISTA','DISTRIBUICAO DE PANFLETOS','DIVULGACAO POR PANFLETAGEM')
alias('MOBILIZACAO','Ativista de campanha','ATIVISTA','SERVICO DE ATIVISTA','SERVICOS DE ATIVISTA')
alias('MOTORISTAS','Serviços de motorista','MOTORISTA','SERVICO DE MOTORISTA','SERVICOS DE MOTORISTA')
alias('PESSOAL','Coordenação de campanha','COORDENADOR DE CAMPANHA','COORDENADORA DE CAMPANHA','COORDENACAO DE CAMPANHA','COORDENADOR GERAL DE CAMPANHA','COORDENADOR ELEITORAL')
alias('PESSOAL','Coordenação sem função detalhada','COORDENADOR','COORDENADORA','COORDENACAO','COORDENADOR DE EQUIPE','COORDENADOR REGIONAL','COORDENADOR GERAL','LIDER DE EQUIPE','FUNCAO DE COORDENADOR DE EQUIPE')
alias('PESSOAL','Assistência de campanha','ASSISTENTE DE CAMPANHA','ASSISTENTE DE CAMPANHA ELEITORAL','ASSISTENTE')
alias('PESSOAL','Despesas com pessoal','DESPESA COM PESSOAL','DESPESAS COM PESSOAL','DESPESA COM PESSOAL DE CAMPANHA')
alias('VEICULOS','Locação de veículos','LOCACAO DE VEICULO','LOCACAO DE VEICULOS','LOCACAO VEICULO','ALUGUEL DO CARRO')
alias('IMOVEIS','Locação de imóveis','LOCACAO DE IMOVEL','LOCACAO DE IMOVEL PARA O COMITE DE CAMPANHA')
alias('PUBLICIDADE_GERAL','Publicidade e marketing sem modalidade definida','MARKETING','SERVICOS DE MARKETING','SERVICO DE MARKETING','CONSULTORIA DE MARKETING','PROPAGANDA E PUBLICIDADE','SERVICOS DE PUBLICIDADE')
alias('PUBLICIDADE_GERAL','Marketing digital sem especificação de mídia paga','MARKETING DIGITAL')
alias('CARRO_SOM','Carro de som','CARRO DE SOM','PUBLICIDADE POR CARRO DE SOM')
alias('AUDIOVISUAL','Jingles','JINGLE','PRODUCAO DE JINGLE')
alias('AUDIOVISUAL','Produção de vídeos','PRODUCAO DE VIDEOS')
alias('AUDIOVISUAL','Produção audiovisual','CRIACAO E PRODUCAO AUDIOVISUAL','PROGRAMA DE RADIO E TV','PRODUCAO PARA RADIO E TELEVISAO','PRODUCAO DE PROGRAMA DE TV')
alias('REDES_DIGITAIS','Plataforma digital sem especificação do serviço','FACEBOOK','GOOGLE','INSTAGRAM')
alias('COMUNICACAO','Comunicação sem especificação','SERVICOS DE COMUNICACAO','ASSESSORIA DE COMUNICACAO')
alias('PESQUISAS','Pesquisas eleitorais e de opinião','PESQUISA','PESQUISA ELEITORAL','PESQUISA QUALITATIVA')
alias('POSTAIS','Serviços postais','SERVICOS POSTAIS','CORREIOS','MALA DIRETA POSTAL')
MISSING={'','NULO','NULL','NA','N A','NAO INFORMADO','NAO INFORMADA','SEM INFORMACAO','SEM DESCRICAO','NAO SE APLICA','NAO ESPECIFICADO','NAO ESPECIFICADA'}
UNRESOLVED={'GENERICO','COMUNICACAO','REDES_DIGITAIS'}

def normalize(s):
 s=unicodedata.normalize('NFD',s or '')
 s=''.join(c for c in s if unicodedata.category(c)!='Mn')
 return re.sub(r'[^A-Z0-9]+',' ',s.upper()).strip()

BYCODE={r[0]:r for r in RULES}
ALIAS={}
for key,label,code in ALIASES:
 key=normalize(key)
 if key in ALIAS and ALIAS[key]!=(label,code): raise ValueError('Alias conflitante: '+key)
 ALIAS[key]=(label,code)

def classify(raw):
 key=normalize(raw)
 if key in MISSING:
  return dict(categoria_chave=None,categoria_padronizada='Não informada',grupo_despesa='Não informada',modalidade_publicidade_sugerida=None,eh_publicidade_sugerida=None,status_classificacao='AUSENTE',requer_revisao=True,regras_aplicadas=None,grupos_detectados=None)
 matches=[r for r in RULES if re.search(r[4],key) and not(r[5] and re.search(r[5],key))]
 if key in ALIAS:
  label,code=ALIAS[key];r=BYCODE[code]
  return dict(categoria_chave=key,categoria_padronizada=label,grupo_despesa=r[1],modalidade_publicidade_sugerida=r[2],eh_publicidade_sugerida=r[3],status_classificacao='ALIAS_EXPLICITO',requer_revisao=code in UNRESOLVED,regras_aplicadas='ALIAS:'+code,grupos_detectados=r[1])
 if len(matches)==1:
  r=matches[0]
  return dict(categoria_chave=key,categoria_padronizada=r[1],grupo_despesa=r[1],modalidade_publicidade_sugerida=r[2],eh_publicidade_sugerida=r[3],status_classificacao='REGRA_TEXTUAL_REVISAR',requer_revisao=True,regras_aplicadas=r[0],grupos_detectados=r[1])
 return dict(categoria_chave=key,categoria_padronizada=key,grupo_despesa='Mistos — revisar' if matches else 'Não classificada — revisar',modalidade_publicidade_sugerida=None,eh_publicidade_sugerida=None,status_classificacao='MULTIPLAS_CATEGORIAS' if matches else 'SEM_REGRA',requer_revisao=True,regras_aplicadas=' | '.join(sorted(r[0] for r in matches)) or None,grupos_detectados=' | '.join(sorted(r[1] for r in matches)) or None)

def lit(x):
 if x is None:return 'NULL'
 if isinstance(x,bool):return 'TRUE' if x else 'FALSE'
 return "'"+str(x).replace("'","''")+"'"
def vals(rows):return ',\n'.join('    ('+', '.join(lit(x) for x in row)+')' for row in rows)

def make_sql():
 missing=', '.join(lit(x) for x in sorted(MISSING))
 unresolved=', '.join(lit(x) for x in sorted(UNRESOLVED))
 matches_sql='\n UNION ALL\n'.join(' SELECT chave, '+lit(r[0])+' AS codigo_regra FROM chaves WHERE regexp_matches(chave, '+lit(r[4])+')'+(' AND NOT regexp_matches(chave, '+lit(r[5])+')' if r[5] else '') for r in RULES)
 return '''/* Q9 — normalização e agrupamento analítico de descrições de despesas.
Selecionar antes o banco/schema com Despesa_Candidatura(id_despesa,
id_candidatura,categoria,valor). Executar a instalação uma vez.
Não altera tabelas nem valores. Cria/substitui apenas macro e views q9.
Grupos sugeridos a partir de texto; não são categorias oficiais do TSE.
A exportação usada contém exatamente 50.000 descrições e pode ser parcial.
As regras são aplicadas a TODAS as descrições existentes no banco selecionado.

ALIAS_EXPLICITO: equivalência definida no dicionário fornecido; não significa
validação oficial. REGRA_TEXTUAL_REVISAR: sugestão por expressão regular.
MULTIPLAS_CATEGORIAS: mais de um grupo detectado, sem rateio do valor.
SEM_REGRA/AUSENTE: preservados sem classificação forçada.
FALSE no indicador de publicidade significa "fora do conceito estreito de
publicidade adotado nesta proposta", não uma classificação legal ou oficial.
NULL significa indefinido. Toda REGRA_TEXTUAL_REVISAR requer conferência.
Panfletagem e militância ficam em mobilização com publicidade indefinida:
a inclusão no conceito de propaganda deve ser uma decisão metodológica.
As categorias são processadas uma vez por descrição distinta, antes da junção.
*/
BEGIN TRANSACTION;
CREATE OR REPLACE MACRO q9_normalizar_categoria(texto) AS
    trim(regexp_replace(upper(strip_accents(coalesce(cast(texto AS VARCHAR), ''))),
                        '[^A-Z0-9]+', ' ', 'g'));

CREATE OR REPLACE VIEW vw_q9_regras_categorias AS
SELECT * FROM (VALUES
'''+vals(RULES)+'''
) AS r(codigo_regra, grupo_despesa, modalidade_publicidade_sugerida,
       eh_publicidade_sugerida, padrao, exclusao);

CREATE OR REPLACE VIEW vw_q9_aliases_categorias AS
SELECT * FROM (VALUES
'''+vals([(k,*ALIAS[k]) for k in sorted(ALIAS)])+'''
) AS a(categoria_chave, categoria_padronizada, codigo_regra);

CREATE OR REPLACE VIEW vw_q9_categorias AS
WITH distintas AS (
 SELECT DISTINCT categoria AS categoria_original,
        q9_normalizar_categoria(categoria) AS chave
 FROM "Despesa_Candidatura"
), chaves AS (
 SELECT DISTINCT chave FROM distintas
), correspondencias AS (
'''+matches_sql+'''
), detectadas AS (
 SELECT c.chave, count(r.codigo_regra) AS quantidade_regras,
        min(r.codigo_regra) AS regra_unica,
        string_agg(r.codigo_regra, ' | ' ORDER BY r.codigo_regra) AS regras,
        string_agg(r.grupo_despesa, ' | ' ORDER BY r.grupo_despesa) AS grupos
 FROM chaves c LEFT JOIN correspondencias hit ON hit.chave=c.chave
 LEFT JOIN vw_q9_regras_categorias r ON r.codigo_regra=hit.codigo_regra
 GROUP BY c.chave
)
SELECT
 d.categoria_original,
 CASE WHEN d.chave IN ('''+missing+''') THEN NULL ELSE d.chave END AS categoria_chave,
 CASE WHEN d.chave IN ('''+missing+''') THEN 'Não informada'
      WHEN a.categoria_chave IS NOT NULL THEN a.categoria_padronizada
      WHEN x.quantidade_regras=1 THEN u.grupo_despesa
      ELSE d.chave END AS categoria_padronizada,
 CASE WHEN d.chave IN ('''+missing+''') THEN 'Não informada'
      WHEN a.categoria_chave IS NOT NULL THEN ar.grupo_despesa
      WHEN x.quantidade_regras=1 THEN u.grupo_despesa
      WHEN x.quantidade_regras>1 THEN 'Mistos — revisar'
      ELSE 'Não classificada — revisar' END AS grupo_despesa,
 CASE WHEN d.chave IN ('''+missing+''') THEN NULL
      WHEN a.categoria_chave IS NOT NULL THEN ar.modalidade_publicidade_sugerida
      WHEN x.quantidade_regras=1 THEN u.modalidade_publicidade_sugerida
 END AS modalidade_publicidade_sugerida,
 CASE WHEN d.chave IN ('''+missing+''') THEN NULL::BOOLEAN
      WHEN a.categoria_chave IS NOT NULL THEN ar.eh_publicidade_sugerida
      WHEN x.quantidade_regras=1 THEN u.eh_publicidade_sugerida
 END AS eh_publicidade_sugerida,
 CASE WHEN d.chave IN ('''+missing+''') THEN 'AUSENTE'
      WHEN a.categoria_chave IS NOT NULL THEN 'ALIAS_EXPLICITO'
      WHEN x.quantidade_regras=1 THEN 'REGRA_TEXTUAL_REVISAR'
      WHEN x.quantidade_regras>1 THEN 'MULTIPLAS_CATEGORIAS'
      ELSE 'SEM_REGRA' END AS status_classificacao,
 CASE WHEN d.chave IN ('''+missing+''') THEN TRUE
      WHEN a.categoria_chave IS NOT NULL AND a.codigo_regra NOT IN ('''+unresolved+''') THEN FALSE
      ELSE TRUE END AS requer_revisao,
 CASE WHEN d.chave IN ('''+missing+''') THEN NULL
      WHEN a.categoria_chave IS NOT NULL THEN 'ALIAS:' || a.codigo_regra
      ELSE x.regras END AS regras_aplicadas,
 CASE WHEN d.chave IN ('''+missing+''') THEN NULL
      WHEN a.categoria_chave IS NOT NULL THEN ar.grupo_despesa
      ELSE x.grupos END AS grupos_detectados
FROM distintas d
JOIN detectadas x ON x.chave=d.chave
LEFT JOIN vw_q9_aliases_categorias a ON a.categoria_chave=d.chave
LEFT JOIN vw_q9_regras_categorias ar ON ar.codigo_regra=a.codigo_regra
LEFT JOIN vw_q9_regras_categorias u ON u.codigo_regra=x.regra_unica;

CREATE OR REPLACE VIEW vw_q9_despesas_normalizadas AS
SELECT d.id_despesa, d.id_candidatura,
       d.categoria AS categoria_original, c.categoria_chave,
       c.categoria_padronizada, c.grupo_despesa,
       c.modalidade_publicidade_sugerida, c.eh_publicidade_sugerida,
       c.status_classificacao, c.requer_revisao, c.regras_aplicadas,
       c.grupos_detectados, d.valor
FROM "Despesa_Candidatura" d
LEFT JOIN vw_q9_categorias c
 ON c.categoria_original IS NOT DISTINCT FROM d.categoria;

CREATE OR REPLACE VIEW vw_q9_resumo_categorias AS
SELECT grupo_despesa, status_classificacao, requer_revisao,
       eh_publicidade_sugerida,
       count(*) AS registros_agregados,
       count(DISTINCT id_candidatura) AS candidaturas,
       count(DISTINCT categoria_original) AS descricoes_originais,
       count(valor) FILTER (WHERE isfinite(valor)) AS registros_com_valor_finito,
       sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
           AS valor_contratado
FROM vw_q9_despesas_normalizadas
GROUP BY grupo_despesa, status_classificacao, requer_revisao,
         eh_publicidade_sugerida;
COMMIT;

-- CONSULTAS (executar individualmente após instalar).
-- 1. Lista de categorias normalizadas e a justificativa por regra.
SELECT * FROM vw_q9_categorias
ORDER BY grupo_despesa, categoria_padronizada, categoria_original;

-- 2. Ranking por grupo (inclui sugestões ainda não revisadas).
SELECT grupo_despesa, count(*) AS registros_agregados,
       count(DISTINCT id_candidatura) AS candidaturas,
       sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
           AS valor_contratado
FROM vw_q9_despesas_normalizadas
GROUP BY grupo_despesa
ORDER BY valor_contratado DESC NULLS LAST;

-- 3. Fila de revisão priorizada por valor.
SELECT categoria_original, categoria_padronizada, grupo_despesa,
       status_classificacao, grupos_detectados,
       sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
           AS valor_contratado
FROM vw_q9_despesas_normalizadas
WHERE requer_revisao
GROUP BY categoria_original, categoria_padronizada, grupo_despesa,
         status_classificacao, grupos_detectados
ORDER BY valor_contratado DESC NULLS LAST;

-- 4. Conferência: uma linha por ID de despesa e mesmos valores da fonte.
SELECT
 (SELECT count(*) FROM "Despesa_Candidatura") AS linhas_fonte,
 count(*) AS linhas_view, count(DISTINCT id_despesa) AS ids_despesa_view,
 sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
     AS total_view,
 (SELECT sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
  FROM "Despesa_Candidatura") AS total_fonte
FROM vw_q9_despesas_normalizadas;

-- 5. Subconjunto estrito por equivalências explícitas de publicidade.
-- Não representa toda a publicidade da base: omite inferências e indefinidos.
SELECT grupo_despesa,
       sum(CASE WHEN isfinite(valor) THEN try_cast(valor AS DECIMAL(24,2)) END)
           AS valor_contratado
FROM vw_q9_despesas_normalizadas
WHERE eh_publicidade_sugerida IS TRUE
  AND status_classificacao='ALIAS_EXPLICITO'
  AND NOT requer_revisao
GROUP BY grupo_despesa
ORDER BY valor_contratado DESC NULLS LAST;
'''

def load(path):
 s=Path(path).read_text(encoding='utf-8-sig')
 try:rows=json.loads(s,parse_float=Decimal)
 except json.JSONDecodeError:rows=[json.loads(l,parse_float=Decimal) for l in s.splitlines() if l.strip()]
 if not isinstance(rows,list):raise ValueError('Esperada lista JSON ou objetos NDJSON por linha.')
 for r in rows:
  if not isinstance(r,dict) or 'categoria' not in r:raise ValueError('Linha sem categoria.')
 return rows

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('exportacao',type=Path)
 p.add_argument('--saida',type=Path,default=Path('q9_normalizacao'))
 a=p.parse_args();a.saida.mkdir(parents=True,exist_ok=True)
 rows=load(a.exportacao)
 (a.saida/'q9_normalizacao.sql').write_text(make_sql(),encoding='utf-8')
 enriched=[dict(r,**classify(r['categoria'])) for r in rows]
 columns=['categoria','categoria_chave','categoria_padronizada','grupo_despesa','modalidade_publicidade_sugerida','eh_publicidade_sugerida','status_classificacao','requer_revisao','regras_aplicadas','grupos_detectados','registros_agregados','candidaturas','registros_com_valor','valor_contratado']
 with (a.saida/'categorias_normalizadas.csv').open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,columns,delimiter=';',extrasaction='ignore');w.writeheader();w.writerows(enriched)
 totals=defaultdict(lambda:dict(descricoes=0,registros_agregados=0,valor_contratado=Decimal(0)))
 for r in enriched:
  k=(r['grupo_despesa'],r['status_classificacao'])
  totals[k]['descricoes']+=1
  totals[k]['registros_agregados']+=int(r.get('registros_agregados') or 0)
  totals[k]['valor_contratado']+=Decimal(str(r.get('valor_contratado') or 0)).quantize(Decimal('.01'))
 with (a.saida/'resumo_exportacao.csv').open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,['grupo_despesa','status_classificacao','descricoes','registros_agregados','valor_contratado'],delimiter=';');w.writeheader()
  for (g,s),v in sorted(totals.items(),key=lambda item:item[1]['valor_contratado'],reverse=True):w.writerow(dict(grupo_despesa=g,status_classificacao=s,**v))
 summary=dict(linhas_exportadas=len(rows),categorias_originais=len({r['categoria'] for r in rows}),chaves_normalizadas=len({r['categoria_chave'] for r in enriched if r['categoria_chave'] is not None}),status=dict(Counter(r['status_classificacao'] for r in enriched)),total_exportado_centavos=str(sum(v['valor_contratado'] for v in totals.values())),observacao='Resultados relativos somente à exportação recebida; 50.000 linhas podem indicar limite de exportação. Não somar candidaturas entre categorias.')
 (a.saida/'resumo.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(summary,ensure_ascii=False))

if __name__=='__main__':main()
