# Inscrições — FTrails · IA na Gestão Universitária

Sistema de inscrição do **Curso 1 · Introdução à Inteligência Artificial Aplicada à Gestão Universitária**, da Trilha FTrails de Aprendizagem em IA — Laboratório de Dados (DataLab), Faculdade de Tecnologia, Universidade de Brasília.

## Como funciona

- **Front estático** (`index.html`, `admin.html`) + **funções serverless** da Vercel (`/api`).
- **Banco:** Supabase (PostgreSQL), acessado apenas do servidor com a *service role key*.
- **Dupla confirmação:** a inscrição fica *pendente*, a pessoa recebe um e-mail com link e só ocupa a vaga ao confirmar (reserva expira em 48h).
- **Vagas:** 80 internas (e-mail `@unb.br`) + 20 externas (demais instituições brasileiras, domínio `.br`). Controle de limite atômico no banco.
- **Geolocalização:** capturada pelos headers `x-vercel-ip-country-region` / `x-vercel-ip-city` e exibida no painel por região.

## Endpoints

| Rota | Método | Descrição |
|------|--------|-----------|
| `/` | GET | Página do curso + formulário de inscrição |
| `/api/register` | POST | Cria inscrição pendente e envia e-mail de confirmação |
| `/api/confirm?token=…` | GET | Confirma a inscrição (link do e-mail) |
| `/api/vagas` | GET | Contagem pública de vagas restantes |
| `/admin` | GET | Painel protegido por senha (mapa de regiões + estatísticas) |
| `/api/stats?pw=…` | GET | Dados do painel (requer `ADMIN_PASSWORD`) |

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://ptvodrbbpodyqjjpbelp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Project Settings → API → service_role)* |
| `SMTP_USER` | e-mail Gmail do DataLab (remetente) |
| `SMTP_PASS` | senha de app do Gmail |
| `MAIL_FROM` | `FTrails DataLab <datalab@exemplo.br>` |
| `ADMIN_PASSWORD` | senha do painel `/admin` |
| `BASE_URL` | URL pública canônica (ex.: `https://www.unbdatalab.org/fttrails`) |

> `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS` e `ADMIN_PASSWORD` são segredos — configure-os apenas no painel da Vercel, nunca no código.

## Banco de dados

Tabela `ftrails_registrations` e funções `ftrails_register`, `ftrails_confirm`, `ftrails_stats`, `ftrails_regiao` no schema `public` do projeto Supabase (sa-east-1). As funções são `security definer` e só podem ser executadas pela `service_role`.
