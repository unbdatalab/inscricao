const { getSupabase, checkInstitutionalEmail, isValidCPF, UFS, VINCULOS } = require('../lib/util');

const CURSO = 'gestao';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Método não permitido.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const nome = String(body.nome || '').trim();
  const cpf = String(body.cpf || '').trim();
  const email = String(body.email || '').trim();
  const telefone = String(body.telefone || '').trim();
  const instituicao = String(body.instituicao || '').trim();
  const vinculo = String(body.vinculo || '').trim();
  const cargo = String(body.cargo || '').trim();
  const uf = String(body.uf || '').trim().toUpperCase();
  const municipio = String(body.municipio || '').trim();
  const dataNascimento = String(body.data_nascimento || '').trim();
  const usaNomeSocial = body.usa_nome_social === true || body.usa_nome_social === 'sim' || body.usa_nome_social === 'true';
  const nomeSocial = String(body.nome_social || '').trim();
  const cep = String(body.cep || '').trim();
  const logradouro = String(body.logradouro || '').trim();
  const numero = String(body.numero || '').trim();
  const bairro = String(body.bairro || '').trim();
  const complemento = String(body.complemento || '').trim();
  const desafio = String(body.desafio || '').trim();
  const estrangeiro = body.estrangeiro === true || body.estrangeiro === 'sim' || body.estrangeiro === 'true' || body.estrangeiro === 'on';
  const passaporte = String(body.passaporte || '').trim();

  // Validações
  if (nome.length < 3) return res.status(400).json({ status: 'error', field: 'nome', message: 'Informe seu nome completo.' });
  if (estrangeiro) {
    if (passaporte.length < 4) return res.status(400).json({ status: 'error', field: 'passaporte', message: 'Informe o número do passaporte.' });
  } else {
    if (!isValidCPF(cpf)) return res.status(400).json({ status: 'error', field: 'cpf', message: 'CPF inválido.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return res.status(400).json({ status: 'error', field: 'data_nascimento', message: 'Informe sua data de nascimento.' });
  const chk = checkInstitutionalEmail(email);
  if (!chk.ok) {
    return res.status(400).json({ status: 'error', field: 'email', message: 'Informe um e-mail válido.' });
  }
  if (telefone.replace(/\D/g, '').length < 10) return res.status(400).json({ status: 'error', field: 'telefone', message: 'Informe um telefone/celular com DDD.' });
  if (usaNomeSocial && nomeSocial.length < 2) return res.status(400).json({ status: 'error', field: 'nome_social', message: 'Informe o nome social.' });
  if (instituicao.length < 2) return res.status(400).json({ status: 'error', field: 'instituicao', message: 'Informe sua instituição.' });
  if (!VINCULOS.includes(vinculo)) return res.status(400).json({ status: 'error', field: 'vinculo', message: 'Selecione seu vínculo.' });
  if (cep.replace(/\D/g, '').length !== 8) return res.status(400).json({ status: 'error', field: 'cep', message: 'Informe um CEP válido (8 dígitos).' });
  if (logradouro.length < 2) return res.status(400).json({ status: 'error', field: 'logradouro', message: 'Informe a rua/avenida.' });
  if (numero.length < 1) return res.status(400).json({ status: 'error', field: 'numero', message: 'Informe o número.' });
  if (bairro.length < 2) return res.status(400).json({ status: 'error', field: 'bairro', message: 'Informe o bairro.' });
  if (!UFS.includes(uf)) return res.status(400).json({ status: 'error', field: 'uf', message: 'Selecione a UF.' });
  if (municipio.length < 2) return res.status(400).json({ status: 'error', field: 'municipio', message: 'Informe o município.' });
  if (desafio.length < 5) return res.status(400).json({ status: 'error', field: 'desafio', message: 'Conte, em poucas palavras, seu maior desafio na gestão universitária.' });

  // Geolocalização a partir dos headers da Vercel
  const ip_country = req.headers['x-vercel-ip-country'] || null;
  const ip_region = req.headers['x-vercel-ip-country-region'] || null;
  let ip_city = req.headers['x-vercel-ip-city'] || null;
  if (ip_city) { try { ip_city = decodeURIComponent(ip_city); } catch { /* mantém */ } }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ status: 'error', message: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_register', {
    p_curso: CURSO, p_nome: nome, p_cpf: cpf, p_email: email, p_telefone: telefone,
    p_instituicao: instituicao, p_vinculo: vinculo, p_cargo: cargo, p_uf: uf, p_municipio: municipio,
    p_ip_region: ip_region, p_ip_country: ip_country, p_ip_city: ip_city,
    p_data_nascimento: dataNascimento, p_usa_nome_social: usaNomeSocial, p_nome_social: nomeSocial,
    p_cep: cep, p_logradouro: logradouro, p_numero: numero, p_bairro: bairro, p_complemento: complemento,
    p_desafio: desafio, p_estrangeiro: estrangeiro, p_passaporte: passaporte
  });

  if (error) {
    console.error('register rpc error', error);
    return res.status(500).json({ status: 'error', message: 'Erro ao processar a inscrição. Tente novamente em instantes.' });
  }

  if (data.status === 'closed') {
    return res.status(409).json({ status: 'closed', message: 'As inscrições estão encerradas.' });
  }
  if (data.status === 'duplicate') {
    return res.status(409).json({ status: 'duplicate', message: 'Este e-mail já possui uma inscrição neste curso.' });
  }
  if (data.status === 'full') {
    const cat = data.categoria === 'unb' ? 'internas (UnB)' : 'externas';
    return res.status(409).json({ status: 'full', categoria: data.categoria, message: `As vagas ${cat} para este curso estão esgotadas.` });
  }

  // status ok — inscrição registrada como PENDENTE; a confirmação é feita pela coordenação no painel
  return res.status(200).json({
    status: 'ok',
    categoria: data.categoria,
    message: 'Inscrição recebida! Sua vaga está reservada e será confirmada pela coordenação. Você receberá um e-mail de confirmação quando isso ocorrer.'
  });
};
