import urllib.request,zipfile,io,json
URL='https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2024.zip'
class RemoteZip(io.RawIOBase):
 def __init__(self,url):self.url=url;self.n=int(urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=30).headers['Content-Length']);self.pos=0
 def seekable(self):return True
 def seek(self,n,whence=0):self.pos=n if whence==0 else self.pos+n if whence==1 else self.n+n;return self.pos
 def tell(self):return self.pos
 def read(self,n=-1):
  n=self.n-self.pos if n<0 else min(n,self.n-self.pos)
  if n<=0:return b''
  req=urllib.request.Request(self.url,headers={'Range':f'bytes={self.pos}-{self.pos+n-1}'})
  with urllib.request.urlopen(req,timeout=45) as r:
   if r.status!=206:raise RuntimeError('Servidor não respeitou leitura parcial')
   data=r.read(n)
  self.pos+=len(data);return data
if __name__=='__main__':
 with zipfile.ZipFile(RemoteZip(URL)) as z:
  for f in z.infolist():
   if 'receitas_candidatos' in f.filename.lower() or 'leiame' in f.filename.lower():print(json.dumps({'name':f.filename,'size':f.file_size,'compressed':f.compress_size},ensure_ascii=False))
