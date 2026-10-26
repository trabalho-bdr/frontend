"""Explicit query boundary; the HTTP composition root supplies the runner."""
from typing import Protocol,Any
from . import database
class QueryRunner(Protocol):
    def __call__(self,sql:str,params=()) -> list[dict[str,Any]]: ...
_runner:QueryRunner=database._rows
def configure_query_runner(runner:QueryRunner):
    global _runner
    _runner=runner
def execute(sql,params=()):
    return _runner(sql,params)
