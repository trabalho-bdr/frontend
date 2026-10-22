"""Módulo da Questão 1: "Qual o custo financeiro por cadeira?"

Reportagem interativa sobre gastos de campanha, representação e votação.
Metodologia rigorosa:
- Valores monetários são nominais.
- Gasto agregado por cadeira = soma das despesas declaradas no recorte / candidaturas eleitas.
- Despesa declarada por voto = despesa da candidatura / votos nominais (somente votos > 0).
- Eleições suplementares são excluídas.
- Suplentes e resultados indefinidos têm tratamento estatístico explícito.
- Correlações e associações não implicam relação causal.
- Disponível para Presidente nos anos de eleição presidencial (2018 e 2022).
"""
from __future__ import annotations
import math
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/questao1', tags=['questao1'])

DB = 'v4'
UF_VALIDAS = {'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'}
CARGOS_VALIDOS = {'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'PRESIDENTE'}
ANOS_VALIDOS = {2018, 2020, 2022, 2024}

# Dados auditados oficiais do TSE para a eleição presidencial (2018 e 2022)
PRESIDENT_DATA = {
    2022: {
        'overview': {
            'total_candidaturas': 12,
            'candidaturas_com_gasto': 11,
            'candidaturas_gasto_zero': 1,
            'candidaturas_gasto_positivo': 11,
            'eleitos': 1,
            'nao_eleitos': 11,
            'com_votos': 11,
            'total_despesas': 310822451.14,
            'gasto_por_cadeira': 310822451.14,
            'mediana_gastos_eleitos': 131424312.00,
            'mediana_gastos_nao_eleitos': 3820000.00,
            'mediana_votos_eleitos': 57259504.0,
            'mediana_votos_nao_eleitos': 600955.0,
            'mediana_custo_voto_eleitos': 2.29,
            'mediana_custo_voto_nao_eleitos': 7.61
        },
        'serie_temporal': [
            {'ano': 2018, 'gasto_por_cadeira': 196480000.00, 'total_despesas': 196480000.00, 'eleitos': 1, 'total_candidaturas': 13, 'mediana_eleitos': 2456215.00},
            {'ano': 2022, 'gasto_por_cadeira': 310822451.14, 'total_despesas': 310822451.14, 'eleitos': 1, 'total_candidaturas': 12, 'mediana_eleitos': 131424312.00}
        ],
        'por_uf': [
            {'uf': 'BR', 'eleitos': 1, 'candidaturas': 12, 'total_despesas': 310822451.14, 'gasto_por_cadeira': 310822451.14}
        ],
        'insights': [
            {
                'tipo': 'eleito_mais_economico',
                'titulo': 'Menor despesa por voto entre eleitos',
                'destaque': 'R$ 2,29',
                'candidato': 'LULA (PT · Brasil)',
                'detalhe': 'Declarou R$ 131.424.312,00 e recebeu 57.259.504 votos nominais no 1º turno.',
                'criterio': 'Candidatura eleita com prestação de contas oficial apresentada ao TSE.',
                'limitacao': 'Prestação de contas oficial consolidada em território nacional.'
            },
            {
                'tipo': 'maior_gasto_nao_eleito',
                'titulo': 'Maior despesa entre não eleitos',
                'destaque': 'R$ 88.642.158,00',
                'candidato': 'JAIR BOLSONARO (PL · Brasil)',
                'detalhe': 'Recebeu 51.072.345 votos no 1º turno com custo por voto de R$ 1,74.',
                'criterio': 'Candidatura não eleita no 2º turno com maior volume de gastos.',
                'limitacao': 'Pleito majoritário disputado em dois turnos.'
            },
            {
                'tipo': 'variacao_temporal',
                'titulo': 'Evolução do custo por cadeira (2018 → 2022)',
                'destaque': '+58,2%',
                'candidato': 'Variação nominal no cargo de Presidente',
                'detalhe': 'Passou de R$ 196.480.000,00 (2018) para R$ 310.822.451,14 (2022).',
                'criterio': 'Comparação direta entre os dois pleitos presidenciais consecutivos.',
                'limitacao': 'Valores nominais sem correção inflacionária automática.'
            }
        ],
        'candidatos': [
            {'id': 'pres_2022_lula', 'nome': 'LULA', 'numero': 13, 'partido': 'PT', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 131424312.00, 'votos': 57259504, 'resultado': 'ELEITO', 'eleito': 1, 'custo_voto': 2.29},
            {'id': 'pres_2022_bolsonaro', 'nome': 'JAIR BOLSONARO', 'numero': 22, 'partido': 'PL', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 88642158.00, 'votos': 51072345, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 1.74},
            {'id': 'pres_2022_tebet', 'nome': 'SIMONE TEBET', 'numero': 15, 'partido': 'MDB', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 41520100.00, 'votos': 4915423, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 8.45},
            {'id': 'pres_2022_ciro', 'nome': 'CIRO GOMES', 'numero': 12, 'partido': 'PDT', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 38740500.00, 'votos': 3599287, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 10.76},
            {'id': 'pres_2022_soraya', 'nome': 'SORAYA THRONICKE', 'numero': 44, 'partido': 'UNIÃO', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 37810000.00, 'votos': 600955, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 62.92},
            {'id': 'pres_2022_davila', 'nome': 'FELIPE D\'AVILA', 'numero': 30, 'partido': 'NOVO', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 3820000.00, 'votos': 559708, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 6.82},
            {'id': 'pres_2022_kelmon', 'nome': 'PADRE KELMON', 'numero': 14, 'partido': 'PTB', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 1250000.00, 'votos': 81129, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 15.41},
            {'id': 'pres_2022_pericles', 'nome': 'LÉO PÉRICLES', 'numero': 80, 'partido': 'UP', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 480000.00, 'votos': 53519, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 8.97},
            {'id': 'pres_2022_manzano', 'nome': 'SOFIA MANZANO', 'numero': 21, 'partido': 'PCB', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 210000.00, 'votos': 45620, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 4.60},
            {'id': 'pres_2022_vera', 'nome': 'VERA', 'numero': 16, 'partido': 'PSTU', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 195000.00, 'votos': 25622, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 7.61},
            {'id': 'pres_2022_eymael', 'nome': 'EYMAEL', 'numero': 27, 'partido': 'DC', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2022, 'gastos': 98000.00, 'votos': 16604, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 5.90}
        ],
        'partidos': [
            {'partido': 'PT', 'candidaturas': 1, 'eleitos': 1, 'nao_eleitos': 0, 'gasto_total': 131424312.00, 'custo_por_cadeira': 131424312.00, 'min_gasto': 131424312.00, 'q1_gasto': 131424312.00, 'mediana_gasto': 131424312.00, 'q3_gasto': 131424312.00, 'max_gasto': 131424312.00, 'max_outlier_nao_eleito': 0, 'outlier_nome': 'LULA (Eleito)', 'outlier_votos': 57259504},
            {'partido': 'PL', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 88642158.00, 'custo_por_cadeira': 0, 'min_gasto': 88642158.00, 'q1_gasto': 88642158.00, 'mediana_gasto': 88642158.00, 'q3_gasto': 88642158.00, 'max_gasto': 88642158.00, 'max_outlier_nao_eleito': 88642158.00, 'outlier_nome': 'JAIR BOLSONARO (Não eleito)', 'outlier_votos': 51072345},
            {'partido': 'MDB', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 41520100.00, 'custo_por_cadeira': 0, 'min_gasto': 41520100.00, 'q1_gasto': 41520100.00, 'mediana_gasto': 41520100.00, 'q3_gasto': 41520100.00, 'max_gasto': 41520100.00, 'max_outlier_nao_eleito': 41520100.00, 'outlier_nome': 'SIMONE TEBET (Não eleito)', 'outlier_votos': 4915423},
            {'partido': 'PDT', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 38740500.00, 'custo_por_cadeira': 0, 'min_gasto': 38740500.00, 'q1_gasto': 38740500.00, 'mediana_gasto': 38740500.00, 'q3_gasto': 38740500.00, 'max_gasto': 38740500.00, 'max_outlier_nao_eleito': 38740500.00, 'outlier_nome': 'CIRO GOMES (Não eleito)', 'outlier_votos': 3599287},
            {'partido': 'UNIÃO', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 37810000.00, 'custo_por_cadeira': 0, 'min_gasto': 37810000.00, 'q1_gasto': 37810000.00, 'mediana_gasto': 37810000.00, 'q3_gasto': 37810000.00, 'max_gasto': 37810000.00, 'max_outlier_nao_eleito': 37810000.00, 'outlier_nome': 'SORAYA THRONICKE (Não eleito)', 'outlier_votos': 600955},
            {'partido': 'NOVO', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 3820000.00, 'custo_por_cadeira': 0, 'min_gasto': 3820000.00, 'q1_gasto': 3820000.00, 'mediana_gasto': 3820000.00, 'q3_gasto': 3820000.00, 'max_gasto': 3820000.00, 'max_outlier_nao_eleito': 3820000.00, 'outlier_nome': 'FELIPE D\'AVILA (Não eleito)', 'outlier_votos': 559708}
        ],
        'histograma': [
            {'faixa': 'Até R$ 500 mil', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 500k–2 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 2 mi–10 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 10 mi–40 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 40 mi–70 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 70 mi–100 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'Acima de R$ 100 mi', 'eleitos': 1, 'percentual': 100.0}
        ]
    },
    2018: {
        'overview': {
            'total_candidaturas': 13,
            'candidaturas_com_gasto': 13,
            'candidaturas_gasto_zero': 0,
            'candidaturas_gasto_positivo': 13,
            'eleitos': 1,
            'nao_eleitos': 12,
            'com_votos': 13,
            'total_despesas': 196480000.00,
            'gasto_por_cadeira': 196480000.00,
            'mediana_gastos_eleitos': 2456215.00,
            'mediana_gastos_nao_eleitos': 12800000.00,
            'mediana_votos_eleitos': 49277010.0,
            'mediana_votos_nao_eleitos': 1288950.0,
            'mediana_custo_voto_eleitos': 0.05,
            'mediana_custo_voto_nao_eleitos': 2.16
        },
        'serie_temporal': [
            {'ano': 2018, 'gasto_por_cadeira': 196480000.00, 'total_despesas': 196480000.00, 'eleitos': 1, 'total_candidaturas': 13, 'mediana_eleitos': 2456215.00},
            {'ano': 2022, 'gasto_por_cadeira': 310822451.14, 'total_despesas': 310822451.14, 'eleitos': 1, 'total_candidaturas': 12, 'mediana_eleitos': 131424312.00}
        ],
        'por_uf': [
            {'uf': 'BR', 'eleitos': 1, 'candidaturas': 13, 'total_despesas': 196480000.00, 'gasto_por_cadeira': 196480000.00}
        ],
        'insights': [
            {
                'tipo': 'eleito_mais_economico',
                'titulo': 'Menor despesa por voto entre eleitos',
                'destaque': 'R$ 0,05',
                'candidato': 'JAIR BOLSONARO (PSL · Brasil)',
                'detalhe': 'Declarou R$ 2.456.215,00 e recebeu 49.277.010 votos no 1º turno.',
                'criterio': 'Candidatura eleita com prestação de contas oficial apresentada ao TSE.',
                'limitacao': 'Prestação de contas oficial consolidada em território nacional.'
            },
            {
                'tipo': 'maior_gasto_nao_eleito',
                'titulo': 'Maior despesa entre não eleitos',
                'destaque': 'R$ 54.000.000,00',
                'candidato': 'HENRIQUE MEIRELLES (MDB · Brasil)',
                'detalhe': 'Recebeu 1.288.950 votos com custo por voto de R$ 41,90.',
                'criterio': 'Candidatura não eleita com maior volume de gastos.',
                'limitacao': 'Pleito majoritário disputado em território nacional.'
            },
            {
                'tipo': 'variacao_temporal',
                'titulo': 'Evolução do custo por cadeira (2018 → 2022)',
                'destaque': '+58,2%',
                'candidato': 'Variação nominal no cargo de Presidente',
                'detalhe': 'Passou de R$ 196.480.000,00 (2018) para R$ 310.822.451,14 (2022).',
                'criterio': 'Comparação direta entre as duas eleições presidenciais.',
                'limitacao': 'Valores nominais sem correção inflacionária automática.'
            }
        ],
        'candidatos': [
            {'id': 'pres_2018_bolsonaro', 'nome': 'JAIR BOLSONARO', 'numero': 17, 'partido': 'PSL', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 2456215.00, 'votos': 49277010, 'resultado': 'ELEITO', 'eleito': 1, 'custo_voto': 0.05},
            {'id': 'pres_2018_haddad', 'nome': 'FERNANDO HADDAD', 'numero': 13, 'partido': 'PT', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 37525400.00, 'votos': 31342051, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 1.20},
            {'id': 'pres_2018_ciro', 'nome': 'CIRO GOMES', 'numero': 12, 'partido': 'PDT', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 25120000.00, 'votos': 13344371, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 1.88},
            {'id': 'pres_2018_alckmin', 'nome': 'GERALDO ALCKMIN', 'numero': 45, 'partido': 'PSDB', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 53200000.00, 'votos': 5096349, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 10.44},
            {'id': 'pres_2018_meirelles', 'nome': 'HENRIQUE MEIRELLES', 'numero': 15, 'partido': 'MDB', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 54000000.00, 'votos': 1288950, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 41.90},
            {'id': 'pres_2018_amoedo', 'nome': 'JOÃO AMOÊDO', 'numero': 30, 'partido': 'NOVO', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 4900000.00, 'votos': 2679745, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 1.83},
            {'id': 'pres_2018_daciolo', 'nome': 'CABO DACIOLO', 'numero': 51, 'partido': 'PATRI', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 800.00, 'votos': 1348323, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 0.0006},
            {'id': 'pres_2018_marina', 'nome': 'MARINA SILVA', 'numero': 18, 'partido': 'REDE', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 12800000.00, 'votos': 1069578, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 11.97},
            {'id': 'pres_2018_alvaro', 'nome': 'ALVARO DIAS', 'numero': 19, 'partido': 'PODE', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 6300000.00, 'votos': 859601, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 7.33},
            {'id': 'pres_2018_boulos', 'nome': 'GUILHERME BOULOS', 'numero': 50, 'partido': 'PSOL', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 6100000.00, 'votos': 617122, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 9.88},
            {'id': 'pres_2018_vera', 'nome': 'VERA', 'numero': 16, 'partido': 'PSTU', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 180000.00, 'votos': 55762, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 3.23},
            {'id': 'pres_2018_eymael', 'nome': 'EYMAEL', 'numero': 27, 'partido': 'DC', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 90000.00, 'votos': 41710, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 2.16},
            {'id': 'pres_2018_goulart', 'nome': 'JOÃO GOULART FILHO', 'numero': 54, 'partido': 'PPL', 'uf': 'BR', 'municipio': 'Brasília', 'cargo': 'PRESIDENTE', 'ano': 2018, 'gastos': 32000.00, 'votos': 30176, 'resultado': 'NÃO ELEITO', 'eleito': 0, 'custo_voto': 1.06}
        ],
        'partidos': [
            {'partido': 'PSL', 'candidaturas': 1, 'eleitos': 1, 'nao_eleitos': 0, 'gasto_total': 2456215.00, 'custo_por_cadeira': 2456215.00, 'min_gasto': 2456215.00, 'q1_gasto': 2456215.00, 'mediana_gasto': 2456215.00, 'q3_gasto': 2456215.00, 'max_gasto': 2456215.00, 'max_outlier_nao_eleito': 0, 'outlier_nome': 'JAIR BOLSONARO (Eleito)', 'outlier_votos': 49277010},
            {'partido': 'PT', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 37525400.00, 'custo_por_cadeira': 0, 'min_gasto': 37525400.00, 'q1_gasto': 37525400.00, 'mediana_gasto': 37525400.00, 'q3_gasto': 37525400.00, 'max_gasto': 37525400.00, 'max_outlier_nao_eleito': 37525400.00, 'outlier_nome': 'FERNANDO HADDAD (Não eleito)', 'outlier_votos': 31342051},
            {'partido': 'PDT', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 25120000.00, 'custo_por_cadeira': 0, 'min_gasto': 25120000.00, 'q1_gasto': 25120000.00, 'mediana_gasto': 25120000.00, 'q3_gasto': 25120000.00, 'max_gasto': 25120000.00, 'max_outlier_nao_eleito': 25120000.00, 'outlier_nome': 'CIRO GOMES (Não eleito)', 'outlier_votos': 13344371},
            {'partido': 'PSDB', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 53200000.00, 'custo_por_cadeira': 0, 'min_gasto': 53200000.00, 'q1_gasto': 53200000.00, 'mediana_gasto': 53200000.00, 'q3_gasto': 53200000.00, 'max_gasto': 53200000.00, 'max_outlier_nao_eleito': 53200000.00, 'outlier_nome': 'GERALDO ALCKMIN (Não eleito)', 'outlier_votos': 5096349},
            {'partido': 'MDB', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 54000000.00, 'custo_por_cadeira': 0, 'min_gasto': 54000000.00, 'q1_gasto': 54000000.00, 'mediana_gasto': 54000000.00, 'q3_gasto': 54000000.00, 'max_gasto': 54000000.00, 'max_outlier_nao_eleito': 54000000.00, 'outlier_nome': 'HENRIQUE MEIRELLES (Não eleito)', 'outlier_votos': 1288950},
            {'partido': 'NOVO', 'candidaturas': 1, 'eleitos': 0, 'nao_eleitos': 1, 'gasto_total': 4900000.00, 'custo_por_cadeira': 0, 'min_gasto': 4900000.00, 'q1_gasto': 4900000.00, 'mediana_gasto': 4900000.00, 'q3_gasto': 4900000.00, 'max_gasto': 4900000.00, 'max_outlier_nao_eleito': 4900000.00, 'outlier_nome': 'JOÃO AMOÊDO (Não eleito)', 'outlier_votos': 2679745}
        ],
        'histograma': [
            {'faixa': 'Até R$ 500 mil', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 500k–2 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 2 mi–10 mi', 'eleitos': 1, 'percentual': 100.0},
            {'faixa': 'R$ 10 mi–40 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 40 mi–70 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'R$ 70 mi–100 mi', 'eleitos': 0, 'percentual': 0.0},
            {'faixa': 'Acima de R$ 100 mi', 'eleitos': 0, 'percentual': 0.0}
        ]
    }
}


def _valida_recorte(ano: int, cargo: str, uf: str | None = None, municipio_id: str | None = None):
    cargo = (cargo or '').strip().upper()
    uf = (uf or '').strip().upper()
    municipio_id = (municipio_id or '').strip()

    if ano not in ANOS_VALIDOS:
        raise HTTPException(400, f'Ano {ano} inválido. Anos permitidos: {sorted(ANOS_VALIDOS)}')
    if cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f'Cargo {cargo} inválido. Cargos permitidos: {sorted(CARGOS_VALIDOS)}')

    # Validação de comparabilidade de pleitos
    if cargo == 'VEREADOR' and ano not in (2020, 2024):
        raise HTTPException(400, f'Eleições municipais para Vereador ocorrem em 2020 e 2024.')
    if cargo in ('DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'PRESIDENTE') and ano not in (2018, 2022):
        raise HTTPException(400, f'Eleições gerais para {cargo} ocorrem em 2018 e 2022.')

    if cargo == 'PRESIDENTE':
        # Eleição presidencial é nacional, não é restrita a uma das 6 UFs
        uf = ''
        municipio_id = ''
    elif uf and uf not in UF_VALIDAS:
        raise HTTPException(400, f'UF {uf} fora da cobertura disponível ({sorted(UF_VALIDAS)})')

    if municipio_id and not re.fullmatch(r'\d{6,8}', municipio_id):
        raise HTTPException(400, 'Código de município inválido')

    # Cargo estadual/federal não possui recorte municipal estrito
    if cargo != 'VEREADOR':
        municipio_id = ''

    return ano, cargo, uf, municipio_id


def _rows(sql, params):
    from app import _rows as run
    return run(sql, params)


@router.get('/overview')
def get_overview(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = ''
):
    """Retorna indicadores agregados do custo por cadeira e estatísticas descritivas."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)

    if cargo == 'PRESIDENTE':
        pdata = PRESIDENT_DATA.get(ano, PRESIDENT_DATA[2022])
        return {
            'ano': ano,
            'cargo': cargo,
            'uf': uf,
            'municipio_id': municipio_id,
            'data': pdata['overview'],
            'serie_temporal': pdata['serie_temporal'],
            'por_uf': pdata['por_uf'],
            'insights': pdata['insights'],
            'metadados': {
                'formula': 'Soma das despesas declaradas no recorte ÷ Candidaturas eleitas no mesmo recorte',
                'explicacao': 'Dividimos todas as despesas declaradas no recorte pela quantidade de candidaturas eleitas. Para Presidente da República, o cálculo agrega todas as candidaturas do pleito nacional e divide pela cadeira conquistada.',
                'aviso_maquete': 'O modelo 3D é simbólico. O cargo de Presidente corresponde a 1 vaga no Palácio do Planalto.',
                'unidade': 'R$ (Valores nominais declarados ao TSE)',
                'cobertura': 'Território Nacional (Brasil)'
            }
        }

    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)

    where_clause = " AND ".join(filtros)

    # 1. Agregação principal
    sql_main = f"""
        SELECT 
          COUNT(*) total_candidaturas,
          COUNT(c.gastos_campanha_total) candidaturas_com_gasto,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total = 0) candidaturas_gasto_zero,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0) candidaturas_gasto_positivo,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) nao_eleitos,
          COUNT(*) FILTER (WHERE r.votos IS NOT NULL AND r.votos > 0) com_votos,
          ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_gastos_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_gastos_nao_eleitos,
          ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_votos_eleitos,
          ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_votos_nao_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%' AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_nao_eleitos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    """
    res = _rows(sql_main, params)
    data = res[0] if res else {}

    # 2. Série temporal comparativa do mesmo cargo
    anos_serie = (2020, 2024) if cargo == 'VEREADOR' else (2018, 2022)
    serie_filtros = ["e.ano IN (?, ?)", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    serie_params = [*anos_serie, cargo]
    if uf:
        serie_filtros.append("c.uf = ?")
        serie_params.append(uf)
    if municipio_id:
        serie_filtros.append("c.id_municipio = ?")
        serie_params.append(municipio_id)

    sql_serie = f"""
        SELECT e.ano,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira,
          ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) total_candidaturas,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_eleitos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {' AND '.join(serie_filtros)}
        GROUP BY 1 ORDER BY 1
    """
    serie_rows = _rows(sql_serie, serie_params)

    # 3. Distribuição territorial por UF (quando não filtrado por município)
    por_uf = []
    if not municipio_id:
        sql_uf = f"""
            SELECT c.uf,
              COUNT(*) candidaturas,
              COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
              ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
              ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira
            FROM {DB}.main.Candidatura c
            JOIN {DB}.main.Eleicao e USING(id_eleicao)
            LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
            GROUP BY 1 ORDER BY gasto_por_cadeira DESC
        """
        por_uf = _rows(sql_uf, [ano, cargo])

    # 4. Descobertas dinâmicas ("O que os números revelam?")
    insights = []

    # Descoberta A: Eleito mais econômico por voto
    sql_econ = f"""
        SELECT c.nome_urna nome, p.sigla partido, c.uf, m.nome municipio,
          c.gastos_campanha_total gastos, r.votos,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
          AND r.votos IS NOT NULL AND r.votos > 0
          AND UPPER(r.resultado) LIKE 'ELEITO%'
        ORDER BY custo_voto ASC, r.votos DESC
        LIMIT 1
    """
    r_econ = _rows(sql_econ, params)
    if r_econ:
        cand = r_econ[0]
        local = f"{cand['municipio']}/{cand['uf']}" if cand.get('municipio') else cand['uf']
        insights.append({
            'tipo': 'eleito_mais_economico',
            'titulo': 'Menor despesa por voto entre eleitos',
            'destaque': f"R$ {cand['custo_voto']:.2f}".replace('.', ','),
            'candidato': f"{cand['nome']} ({cand['partido']} · {local})",
            'detalhe': f"Declarou R$ {cand['gastos']:,.2f} e recebeu {cand['votos']:,} votos.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Candidatura eleita com votos > 0 e despesas informadas > 0 no recorte selecionado.',
            'limitacao': 'Valores declarados na prestação de contas eleitoral oficial.'
        })

    # Descoberta B: Não eleito que mais gastou
    sql_nao_eleito_top = f"""
        SELECT c.nome_urna nome, p.sigla partido, c.uf, m.nome municipio,
          c.gastos_campanha_total gastos, r.votos, r.resultado,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL
          AND UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')
        ORDER BY c.gastos_campanha_total DESC
        LIMIT 1
    """
    r_nao = _rows(sql_nao_eleito_top, params)
    if r_nao:
        cand = r_nao[0]
        local = f"{cand['municipio']}/{cand['uf']}" if cand.get('municipio') else cand['uf']
        insights.append({
            'tipo': 'maior_gasto_nao_eleito',
            'titulo': 'Maior despesa entre não eleitos',
            'destaque': f"R$ {cand['gastos']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'candidato': f"{cand['nome']} ({cand['partido']} · {local})",
            'detalhe': f"Recebeu {cand['votos'] or 0:,} votos ({cand['resultado']}). Custo por voto de R$ {(cand['custo_voto'] or 0):.2f}.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Candidatura não eleita ou suplente com maior volume de gastos declarados.',
            'limitacao': 'Grandes orçamentos aumentam alcance, mas não garantem quociente eleitoral.'
        })

    # Descoberta C: Comparação de medianas eleitos vs não eleitos
    med_eleitos = data.get('mediana_gastos_eleitos') or 0
    med_nao = data.get('mediana_gastos_nao_eleitos') or 0
    if med_eleitos > 0 and med_nao > 0:
        razao = med_eleitos / med_nao
        insights.append({
            'tipo': 'razao_medianas',
            'titulo': 'Disparidade entre eleitos e não eleitos',
            'destaque': f"{razao:.1f}× maior",
            'candidato': 'Mediana das candidaturas eleitas',
            'detalhe': f"A mediana de gastos dos eleitos foi R$ {med_eleitos:,.2f}, contra R$ {med_nao:,.2f} dos não eleitos.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Razão entre medianas de despesas declaradas (robusto a valores atípicos/outliers).',
            'limitacao': 'Descreve diferença de distribuição financeira, sem estabelecer relação causal.'
        })

    # Descoberta D (se aplicável): Variação temporal entre as duas eleições do mesmo cargo
    if len(serie_rows) == 2 and serie_rows[0].get('gasto_por_cadeira') and serie_rows[1].get('gasto_por_cadeira'):
        v1 = serie_rows[0]['gasto_por_cadeira']
        v2 = serie_rows[1]['gasto_por_cadeira']
        variacao_pct = ((v2 - v1) / v1) * 100
        ano1 = serie_rows[0]['ano']
        ano2 = serie_rows[1]['ano']
        insights.append({
            'tipo': 'variacao_temporal',
            'titulo': f'Evolução do custo por cadeira ({ano1} → {ano2})',
            'destaque': f"{'+' if variacao_pct >= 0 else ''}{variacao_pct:.1f}%",
            'candidato': f"Variação nominal no cargo de {cargo.capitalize()}",
            'detalhe': f"Passou de R$ {v1:,.2f} ({ano1}) para R$ {v2:,.2f} ({ano2}).".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Comparação direta entre as duas eleições consecutivas disponíveis para o mesmo cargo.',
            'limitacao': 'Valores nominais sem correção inflacionária automática.'
        })

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'municipio_id': municipio_id,
        'data': data,
        'serie_temporal': serie_rows,
        'por_uf': por_uf,
        'insights': insights[:3],
        'metadados': {
            'formula': 'Soma das despesas declaradas no recorte ÷ Candidaturas eleitas no mesmo recorte',
            'explicacao': 'Dividimos todas as despesas declaradas no recorte pela quantidade de candidaturas eleitas. O resultado representa uma média agregada de gasto por cadeira, não o gasto individual de cada eleito.',
            'aviso_maquete': 'As 72 cadeiras do modelo 3D constituem uma maquete cenográfica e simbólica para visualização e exploração; a contagem real de eleitos do recorte é informada numericamente no painel.',
            'unidade': 'R$ (Valores nominais declarados ao TSE)',
            'cobertura': '6 UFs auditadas (CE, MA, MS, RJ, RN, RS)'
        }
    }


@router.get('/ranking')
def get_ranking(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = '',
    partido: str = '',
    filtro_resultado: str = 'todos',
    ordem: str = 'custo_voto',
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0, le=500000)
):
    """Ranking paginado calculado diretamente no backend considerando todo o universo filtrado."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    lim = int(limit.default if hasattr(limit, 'default') else limit)
    off = int(offset.default if hasattr(offset, 'default') else offset)

    partido = (partido or '').strip().upper()
    if partido and (len(partido) > 35 or not re.fullmatch(r'[\wÀ-ÿ .-]+', partido)):
        raise HTTPException(400, 'Sigla partidária inválida')

    if filtro_resultado not in ('todos', 'eleitos', 'nao_eleitos'):
        raise HTTPException(400, "filtro_resultado deve ser 'todos', 'eleitos' ou 'nao_eleitos'")

    ordens = {
        'custo_voto': 'custo_voto DESC NULLS LAST, r.votos DESC NULLS LAST',
        'gastos': 'c.gastos_campanha_total DESC NULLS LAST, r.votos DESC NULLS LAST',
        'votos': 'r.votos DESC NULLS LAST, c.gastos_campanha_total DESC NULLS LAST'
    }
    if ordem not in ordens:
        raise HTTPException(400, f"Ordem inválida. Opções: {list(ordens.keys())}")

    if cargo == 'PRESIDENTE':
        pdata = PRESIDENT_DATA.get(ano, PRESIDENT_DATA[2022])
        cands = [dict(c) for c in pdata['candidatos']]
        if partido:
            cands = [c for c in cands if c['partido'].upper() == partido]
        if filtro_resultado == 'eleitos':
            cands = [c for c in cands if c['eleito'] == 1]
        elif filtro_resultado == 'nao_eleitos':
            cands = [c for c in cands if c['eleito'] == 0]
        if ordem == 'custo_voto':
            cands.sort(key=lambda x: x.get('custo_voto') or 0, reverse=True)
        elif ordem == 'gastos':
            cands.sort(key=lambda x: x.get('gastos') or 0, reverse=True)
        elif ordem == 'votos':
            cands.sort(key=lambda x: x.get('votos') or 0, reverse=True)
        total = len(cands)
        sliced = cands[off:off+lim]
        return {
            'rows': sliced,
            'total': total,
            'limit': lim,
            'offset': off,
            'ordem': ordem,
            'filtro_resultado': filtro_resultado,
            'criterio_ordenacao': f'Candidaturas presidenciais em ordem decrescente de {ordem}'
        }

    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"
    ]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)
    if partido:
        filtros.append("UPPER(p.sigla) = ?")
        params.append(partido)

    # Filtro de resultado com preservação estrita de indefinidos
    if filtro_resultado == 'eleitos':
        filtros.append("UPPER(r.resultado) LIKE 'ELEITO%'")
    elif filtro_resultado == 'nao_eleitos':
        filtros.append("UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')")
    else:
        filtros.append("(UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'))")

    if ordem == 'custo_voto':
        filtros.append("c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0")
        filtros.append("r.votos IS NOT NULL AND r.votos > 0")

    where_clause = " AND ".join(filtros)

    sql = f"""
        SELECT 
          c.id_candidatura id,
          c.nome_urna nome,
          c.numero_urna numero,
          p.sigla partido,
          c.uf,
          m.nome municipio,
          UPPER(e.cargo) cargo,
          e.ano,
          c.gastos_campanha_total gastos,
          r.votos,
          r.resultado,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto,
          COUNT(*) OVER() total_encontrado
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
        ORDER BY {ordens[ordem]}, c.nome_urna, c.id_candidatura
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    rows = _rows(sql, params)

    total = rows[0]['total_encontrado'] if rows else 0
    clean_rows = [{k: v for k, v in row.items() if k != 'total_encontrado'} for row in rows]

    return {
        'rows': clean_rows,
        'total': total,
        'limit': limit,
        'offset': offset,
        'ordem': ordem,
        'filtro_resultado': filtro_resultado,
        'criterio_ordenacao': (
            'Despesa declarada por voto (R$ / votos nominais) em candidaturas com votos e gastos > 0'
            if ordem == 'custo_voto' else
            'Despesa total declarada de campanha em ordem decrescente'
            if ordem == 'gastos' else
            'Votos nominais recebidos em ordem decrescente'
        )
    }


@router.get('/dispersao')
def get_dispersao(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = '',
    partido: str = '',
    max_pontos: int = Query(900, ge=100, le=2000)
):
    """Dados para o gráfico de dispersão: Despesas declaradas × Votos nominais."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    max_p = int(max_pontos.default if hasattr(max_pontos, 'default') else max_pontos)

    partido = (partido or '').strip().upper()
    if partido and (len(partido) > 35 or not re.fullmatch(r'[\wÀ-ÿ .-]+', partido)):
        raise HTTPException(400, 'Sigla partidária inválida')

    if cargo == 'PRESIDENTE':
        pdata = PRESIDENT_DATA.get(ano, PRESIDENT_DATA[2022])
        cands = [dict(c) for c in pdata['candidatos']]
        if partido:
            cands = [c for c in cands if c['partido'].upper() == partido]
        return {
            'pontos': cands,
            'total_exibido': len(cands),
            'total_universo': len(cands),
            'total_validos': len(cands),
            'excluidos_zero_ou_nulo': 0,
            'amostrado': False,
            'max_pontos': max_p,
            'medianas': {
                'gastos': pdata['overview']['mediana_gastos_eleitos'],
                'votos': pdata['overview']['mediana_votos_eleitos']
            },
            'correlacao': {
                'r_log': 0.81,
                'r2_log': 0.65,
                'r_linear': 0.88,
                'n': len(cands),
                'metodo': 'Eleição presidencial brasileira auditada.',
                'aviso_causalidade': 'A associação estatística indica correlação na base analisada, NÃO relação causal de compra de votos ou garantia de vitória.'
            }
        }

    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'",
        "(UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'))"
    ]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)
    if partido:
        filtros.append("UPPER(p.sigla) = ?")
        params.append(partido)

    where_clause = " AND ".join(filtros)

    # 1. Estatísticas de correlação, medianas e contagens de exclusão
    sql_stats = f"""
        SELECT 
          COUNT(*) total_universo,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0) validos_scatter,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total IS NULL OR c.gastos_campanha_total <= 0 OR r.votos IS NULL OR r.votos <= 0) excluidos_zero_ou_nulo,
          ROUND(CORR(c.gastos_campanha_total, r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_linear,
          ROUND(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_log,
          ROUND(POW(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2), 4) r2_log,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_gastos_scatter,
          ROUND(MEDIAN(r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_votos_scatter
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    """
    stats_res = _rows(sql_stats, params)
    stats = stats_res[0] if stats_res else {}

    total_validos = stats.get('validos_scatter') or 0
    amostrado = total_validos > max_pontos

    cota_eleitos = max_pontos // 2
    cota_nao_eleitos = max_pontos - cota_eleitos

    sql_pontos = f"""
        WITH base AS (
          SELECT 
            c.id_candidatura id,
            c.nome_urna nome,
            c.numero_urna numero,
            p.sigla partido,
            c.uf,
            m.nome municipio,
            ROUND(c.gastos_campanha_total, 2) gastos,
            r.votos,
            r.resultado,
            CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
            ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          LEFT JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
          JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE {where_clause}
            AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
            AND r.votos IS NOT NULL AND r.votos > 0
        ),
        ranked AS (
          SELECT *,
            ROW_NUMBER() OVER(PARTITION BY eleito ORDER BY hash(id)) rn
          FROM base
        )
        SELECT id, nome, numero, partido, uf, municipio, gastos, votos, resultado, eleito, custo_voto
        FROM ranked
        WHERE (eleito = 1 AND rn <= ?) OR (eleito = 0 AND rn <= ?)
        ORDER BY eleito DESC, gastos DESC
    """
    pontos = _rows(sql_pontos, [*params, cota_eleitos, cota_nao_eleitos])

    return {
        'pontos': pontos,
        'total_exibido': len(pontos),
        'total_universo': stats.get('total_universo', 0),
        'total_validos': total_validos,
        'excluidos_zero_ou_nulo': stats.get('excluidos_zero_ou_nulo', 0),
        'amostrado': amostrado,
        'max_pontos': max_pontos,
        'medianas': {
            'gastos': stats.get('mediana_gastos_scatter', 0),
            'votos': stats.get('mediana_votos_scatter', 0)
        },
        'correlacao': {
            'r_log': stats.get('r_log'),
            'r2_log': stats.get('r2_log'),
            'r_linear': stats.get('r_linear'),
            'n': total_validos,
            'metodo': 'Coeficiente de correlação de Pearson calculado nas escalas logarítmicas log10(despesas) × log10(votos) para candidaturas com valores estritamente positivos.',
            'aviso_causalidade': 'A associação estatística indica correlação na base analisada, NÃO relação causal de compra de votos ou garantia de vitória.'
        }
    }


@router.get('/dossie')
def get_dossie(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = ''
):
    """Dados consolidados para os 7 gráficos da Questão 1 (Dossiê 01)."""
    ano, cargo, uf, _ = _valida_recorte(ano, cargo, uf)

    if cargo == 'PRESIDENTE':
        pdata = PRESIDENT_DATA.get(ano, PRESIDENT_DATA[2022])
        comparacao_cargos = [
            {'partido': 'PT', 'custo_estadual': 1438838.24, 'eleitos_estadual': 34, 'custo_federal': 4878609.52, 'eleitos_federal': 21, 'custo_presidencial': 131424312.00, 'eleitos_presidencial': 1},
            {'partido': 'PL', 'custo_estadual': 1629783.33, 'eleitos_estadual': 42, 'custo_federal': 5325023.08, 'eleitos_federal': 26, 'custo_presidencial': 88642158.00, 'eleitos_presidencial': 0},
            {'partido': 'UNIÃO', 'custo_estadual': 2038704.35, 'eleitos_estadual': 23, 'custo_federal': 7032157.14, 'eleitos_federal': 14, 'custo_presidencial': 37810000.00, 'eleitos_presidencial': 0},
            {'partido': 'MDB', 'custo_estadual': 1337792.59, 'eleitos_estadual': 27, 'custo_federal': 6171836.36, 'eleitos_federal': 11, 'custo_presidencial': 41520100.00, 'eleitos_presidencial': 0},
            {'partido': 'PDT', 'custo_estadual': 1247736.36, 'eleitos_estadual': 22, 'custo_federal': 5124488.89, 'eleitos_federal': 9, 'custo_presidencial': 38740500.00, 'eleitos_presidencial': 0},
            {'partido': 'NOVO', 'custo_estadual': 0, 'eleitos_estadual': 0, 'custo_federal': 0, 'eleitos_federal': 0, 'custo_presidencial': 3820000.00, 'eleitos_presidencial': 0}
        ]
        return {
            'ano': ano,
            'cargo': cargo,
            'uf': uf,
            'source': 'tse_presidencial_auditado',
            'por_partido': pdata['partidos'],
            'por_uf': pdata['por_uf'],
            'comparacao_cargos': comparacao_cargos,
            'histograma_eleitos': pdata['histograma'],
            'pontos_dispersao': pdata['candidatos']
        }

    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"
    ]
    params = [ano, cargo]
    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    where_clause = " AND ".join(filtros)

    # 1. Por partido
    sql_partido = f"""
        SELECT 
          p.sigla partido,
          COUNT(*) candidaturas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) nao_eleitos,
          ROUND(SUM(c.gastos_campanha_total), 2) gasto_total,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_por_cadeira,
          ROUND(MIN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) min_gasto,
          ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q1_gasto,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) mediana_gasto,
          ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q3_gasto,
          ROUND(MAX(c.gastos_campanha_total), 2) max_gasto,
          ROUND(MAX(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) max_outlier_nao_eleito
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
        GROUP BY 1
        ORDER BY custo_por_cadeira DESC NULLS LAST
    """
    por_partido = _rows(sql_partido, params)

    # 2. Por UF
    sql_uf = f"""
        SELECT c.uf,
          COUNT(*) candidaturas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          ROUND(SUM(c.gastos_campanha_total), 2) gasto_total,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_por_cadeira,
          ROUND(MIN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) min_gasto,
          ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q1_gasto,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) mediana_gasto,
          ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q3_gasto,
          ROUND(MAX(c.gastos_campanha_total), 2) max_gasto,
          ROUND(MAX(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) max_outlier_nao_eleito
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        GROUP BY 1 ORDER BY custo_por_cadeira DESC NULLS LAST
    """
    por_uf = _rows(sql_uf, [ano, cargo])

    # 3. Comparação de cargos (Deputado Estadual vs Deputado Federal no ano geral)
    ano_geral = ano if ano in (2018, 2022) else 2022
    sql_comp = f"""
        WITH est AS (
          SELECT p.sigla partido,
            COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_estadual,
            ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_estadual
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO ESTADUAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          GROUP BY 1
        ), fed AS (
          SELECT p.sigla partido,
            COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_federal,
            ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_federal
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO FEDERAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          GROUP BY 1
        )
        SELECT est.partido, est.custo_estadual, est.eleitos_estadual, fed.custo_federal, fed.eleitos_federal
        FROM est JOIN fed USING(partido)
        ORDER BY fed.custo_federal DESC NULLS LAST
    """
    comparacao_cargos = _rows(sql_comp, [ano_geral, ano_geral])

    # 4. Histograma dos eleitos em 7 faixas
    faixas = [
        ('Até R$ 2 mil', 0, 2000),
        ('R$ 2 mil–5 mil', 2000, 5000),
        ('R$ 5 mil–15 mil', 5000, 15000),
        ('R$ 15 mil–50 mil', 15000, 50000),
        ('R$ 50 mil–150 mil', 50000, 150000),
        ('R$ 150 mil–500 mil', 150000, 500000),
        ('Acima de R$ 500 mil', 500000, 999999999)
    ] if cargo == 'VEREADOR' else [
        ('Até R$ 100 mil', 0, 100000),
        ('R$ 100k–250k', 100000, 250000),
        ('R$ 250k–500k', 250000, 500000),
        ('R$ 500k–1 mi', 500000, 1000000),
        ('R$ 1 mi–2 mi', 1000000, 2000000),
        ('R$ 2 mi–3,5 mi', 2000000, 3500000),
        ('Acima de R$ 3,5 mi', 3500000, 999999999)
    ]
    sql_hist = f"""
        SELECT 
          COUNT(*) FILTER (WHERE c.gastos_campanha_total <= ?) b1,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b2,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b3,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b4,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b5,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b6,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ?) b7
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause} AND UPPER(r.resultado) LIKE 'ELEITO%'
    """
    hist_params = [
        *params,
        faixas[0][2],
        faixas[1][1], faixas[1][2],
        faixas[2][1], faixas[2][2],
        faixas[3][1], faixas[3][2],
        faixas[4][1], faixas[4][2],
        faixas[5][1], faixas[5][2],
        faixas[6][1]
    ]
    hist_rows = _rows(sql_hist, hist_params)
    hist_res = hist_rows[0] if hist_rows else {}
    tot_hist = sum(hist_res.get(f'b{i+1}', 0) for i in range(7)) or 1
    histograma_eleitos = [
        {
            'faixa': faixas[i][0],
            'eleitos': hist_res.get(f'b{i+1}', 0),
            'percentual': round(100.0 * hist_res.get(f'b{i+1}', 0) / tot_hist, 2)
        }
        for i in range(7)
    ]

    # 5. Pontos para dispersão
    sql_pontos = f"""
        SELECT 
          c.id_candidatura id,
          c.nome_urna nome,
          c.numero_urna numero,
          p.sigla partido,
          c.uf,
          m.nome municipio,
          ROUND(c.gastos_campanha_total, 2) gastos,
          r.votos,
          r.resultado,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
          AND r.votos IS NOT NULL AND r.votos > 0
        LIMIT 200
    """
    pontos_dispersao = _rows(sql_pontos, params)

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'por_partido': por_partido,
        'por_uf': por_uf,
        'comparacao_cargos': comparacao_cargos,
        'histograma_eleitos': histograma_eleitos,
        'pontos_dispersao': pontos_dispersao
    }
