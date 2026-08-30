const XLSX = require('xlsx');
const { getSupabase } = require('../lib/util');

const VINCULO_LABEL = {
  'tae': 'Servidor(a) técnico-administrativo(a)',
  'docente-gestor': 'Docente em função de gestão',
  'externo': 'Gestor(a)/servidor(a) de outra instituição',
  'egresso': 'Egresso(a) da UnB em função de gestão',
  'outro': 'Outro',
};

function fmtDateTime(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function fmtDateBR(s) {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
}

// Exporta TODAS as inscrições (protegido pela senha do painel) como planilha .xlsx.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pw = req.headers['x-admin-password'] || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const cols = 'created_at,status,categoria,nome,nome_social,usa_nome_social,cpf,data_nascimento,email,telefone,' +
               'instituicao,vinculo,cargo,cep,logradouro,numero,bairro,complemento,uf,municipio,ip_region,ip_city,desafio,' +
               'estrangeiro,passaporte';
  const { data, error } = await supabase
    .from('ftrails_registrations')
    .select(cols)
    .eq('curso', 'gestao')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });

  if (error) { console.error('export error', error); return res.status(500).json({ error: 'falha' }); }
  const rows = data || [];

  const head = ['Data/hora', 'Status', 'Categoria', 'Nome completo', 'Nome social', 'Usa nome social', 'CPF',
    'Data de nascimento', 'E-mail', 'Telefone/Celular', 'Instituição', 'Vínculo', 'Cargo', 'CEP', 'Rua/Avenida',
    'Número', 'Bairro', 'Complemento', 'UF', 'Município', 'Região (IP)', 'Cidade (IP)',
    'Maior desafio na gestão universitária', 'Estrangeiro', 'Passaporte'];
  const body = rows.map(x => [
    fmtDateTime(x.created_at),
    x.status === 'confirmed' ? 'Confirmado' : (x.status === 'pending' ? 'Pendente' : (x.status || '')),
    x.categoria === 'unb' ? 'UnB' : 'Externo',
    x.nome || '', x.nome_social || '', x.usa_nome_social ? 'Sim' : 'Não', x.cpf || '',
    fmtDateBR(x.data_nascimento), x.email || '', x.telefone || '', x.instituicao || '',
    VINCULO_LABEL[x.vinculo] || x.vinculo || '', x.cargo || '', x.cep || '', x.logradouro || '',
    x.numero || '', x.bairro || '', x.complemento || '', x.uf || '', x.municipio || '', x.ip_region || '', x.ip_city || '',
    x.desafio || '', x.estrangeiro ? 'Sim' : 'Não', x.passaporte || '',
  ]);

  const DESAFIO_COL = head.indexOf('Maior desafio na gestão universitária');
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  ws['!cols'] = head.map((h, i) => ({ wch: (i === DESAFIO_COL) ? 60 : ((i === 8 || i === 10) ? 30 : (i === 3 ? 26 : (i === 14 ? 24 : 15))) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const hoje = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="inscritos_ftrails_gestao_${hoje}.xlsx"`);
  return res.status(200).send(buf);
};
