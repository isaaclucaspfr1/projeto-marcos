<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# HospFlow — Gestão de Enfermagem

Aplicação React + Vite. Este guia cobre como rodar localmente, publicar no GitHub e colocar em produção na Vercel.

## Rodar localmente

**Pré-requisitos:** Node.js 18+.

1. Instale dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY` com sua chave Gemini.
3. Rode em modo dev: `npm run dev`

## Publicar no GitHub

Repositório sugerido: `marcosprojeto` (pode alterar se preferir).

1. Inicialize o git (se ainda não existir): `git init`
2. Configure o remoto: `git remote add origin git@github.com:<seu-usuario>/marcosprojeto.git`
3. Confirme o status: `git status`
4. Commit inicial: `git add . && git commit -m "chore: bootstrap HospFlow"`
5. Envie para o GitHub: `git push -u origin main`

## Deploy na Vercel

1. Crie um projeto na Vercel e escolha “Import Git Repository”, apontando para `marcosprojeto`.
2. Framework: Vite (auto-detectado). Build: `npm run build`. Output: `dist`.
3. Variáveis de ambiente: adicione `GEMINI_API_KEY` em “Environment Variables” (Production e Preview).
4. Após o primeiro deploy, em “Domains” adicione `hospflow.com.br` e finalize a configuração DNS (CNAME para `cname.vercel-dns.com`).
5. Teste a pré-visualização e, se ok, promova para produção.

### Comandos úteis

- Build para produção: `npm run build`
- Servir build localmente: `npm run preview`
