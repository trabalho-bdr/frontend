"""Read-only MotherDuck connection, serialization and bounded query cache."""
import os,re,threading,time
from copy import deepcopy
from datetime import date,datetime
from decimal import Decimal
from .config import DB

_lock = threading.RLock()
_con = None
_query_cache = {}
# Nome real do banco; usado diretamente nas consultas.





def _open():
    global _con
    with _lock:
        if _con is not None:
            return _con
        if not os.getenv('MOTHERDUCK_TOKEN'):
            raise RuntimeError('MOTHERDUCK_TOKEN não configurado no servidor')
        # A extensão MotherDuck lê esta variável em minúsculas. O servidor
        # recebe a credencial como MOTHERDUCK_TOKEN no arquivo .env.
        os.environ['motherduck_token'] = os.environ['MOTHERDUCK_TOKEN']
        import duckdb
        # Start locally, then attach only the verified v4 database read-only.
        # Workspace auto-attachment can fail on unrelated/stale database aliases.
        target = os.getenv('MOTHERDUCK_DATABASE', 'md:pipeline_bdr_der_completo_v4')
        if target != 'md:pipeline_bdr_der_completo_v4':
            raise RuntimeError('MOTHERDUCK_DATABASE deve apontar para pipeline_bdr_der_completo_v4')
        con = duckdb.connect(target+'?attach_mode=single', read_only=True)
        _con = con
        return con


def _rows(sql, params=()):
    if not re.match(r'^\s*(SELECT|WITH|DESCRIBE|PRAGMA)\b', sql, re.I):
        raise RuntimeError('A API permite somente consultas de leitura')
    key=(sql,tuple(params))
    with _lock:
        cached=_query_cache.get(key)
        if cached and time.monotonic()-cached[0]<60:
            return deepcopy(cached[1])
        con = _open()
        cur = con.execute(sql, list(params))
        cols = [x[0] for x in cur.description]
        result = cur.fetchall()
    def clean(v):
        if isinstance(v, Decimal): return float(v)
        if isinstance(v, (datetime, date)): return v.isoformat()
        return v
    rows=[dict(zip(cols, (clean(v) for v in row))) for row in result]
    with _lock:
        if len(_query_cache)>=128:
            _query_cache.pop(next(iter(_query_cache)))
        _query_cache[key]=(time.monotonic(),rows)
    return deepcopy(rows)


def resolve_database(table_name):
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', table_name):
        raise ValueError('Invalid internal table identifier')
    _rows(f'SELECT 1 FROM {DB}.main.{table_name} LIMIT 1')
    return DB
