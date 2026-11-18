# ⚡ ÁgilLink - Encurtador & Redirecionador Ultra-Rápido para Vercel

Um encurtador de links e redirecionador profissional de altíssima velocidade, desenvolvido em Next.js (App Router), Tailwind CSS e otimizado para a infraestrutura de borda (Edge / Serverless) da **Vercel**.

---

## 🚀 Principais Características

- **Redirecionamento em Milissegundos:** Utiliza HTTP 307 direto da camada de servidor/borda da Vercel, sem intermediários, sem renderização de HTML desnecessária e com headers de cache otimizados.
- **Painel Administrativo Completo:** Crie links encurtados, defina slugs personalizados (ex: `/promo`), veja métricas de cliques em tempo real, pause ou reative links sem precisar apagá-los.
- **Gerador de QR Code Embutido:** Gera instantaneamente imagens PNG de QR Code em alta resolução prontas para download.
- **Armazenamento Híbrido e Resiliente:**
  - **Produção na Vercel:** Suporte nativo ao **Upstash Redis** (Vercel KV) com latência de resposta global de ~5-15ms.
  - **Desenvolvimento Local:** Fallback automático e transparente para arquivo local (`data/links.json`) ou memória, sem necessidade de configurar banco de dados para testar.
- **Zero Configuração Inicial:** Funciona imediatamente após o clone com `npm run dev`.

---

## 🛠️ Tecnologias Utilizadas

- **Next.js 16 (App Router)** com Turbopack
- **React 19**
- **Tailwind CSS v4**
- **@upstash/redis**
- **Lucide React** (Ícones modernos)
- **QRCode** (Geração de QR codes em tempo real)

---

## 💻 Como Rodar Localmente

1. Clone ou acesse a pasta do projeto:
   ```bash
   cd encurtador
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra no navegador:
   ```
   http://localhost:3000
   ```

---

## ☁️ Como Colocar no Ar na Vercel (Passo a Passo)

### Opção 1: Pela Interface Web da Vercel (Recomendado)

1. Suba o código para o seu GitHub / GitLab / Bitbucket.
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. Clique em **Deploy**.
4. Para ativar a persistência definitiva em alta velocidade na Vercel:
   - No painel do seu projeto na Vercel, vá na aba **Storage**.
   - Clique em **Create Database** e selecione **Upstash Redis** (possui tier 100% gratuito com 10.000 requisições/dia).
   - Clique em **Connect** e selecione o seu projeto.
   - A Vercel adicionará automaticamente as variáveis de ambiente necessárias (`KV_REST_API_URL` e `KV_REST_API_TOKEN`).
   - Faça um Redeploy ou novo commit. Pronto!

### Opção 2: Pelo Terminal (Vercel CLI)

1. No terminal da pasta do projeto, execute:
   ```bash
   npx vercel
   ```
2. Siga as instruções rápidas no terminal para vincular à sua conta.

---

## 📁 Estrutura de Arquivos

```
encurtador/
├── src/
│   ├── app/
│   │   ├── [code]/
│   │   │   └── route.ts         # Rota de redirecionamento HTTP 307 instantâneo
│   │   ├── api/
│   │   │   ├── links/
│   │   │   │   ├── route.ts     # Listagem e criação de links
│   │   │   │   └── [code]/
│   │   │   │       └── route.ts # Edição, consulta e exclusão
│   │   │   └── qr/
│   │   │       └── route.ts     # Geração de QR Code em PNG
│   │   ├── globals.css          # Estilos Tailwind CSS
│   │   ├── layout.tsx           # Layout raiz com fontes e metadados
│   │   └── page.tsx             # Painel administrativo completo
│   └── lib/
│       ├── storage.ts           # Camada de armazenamento unificada (Redis / Local / Memória)
│       ├── types.ts             # Tipos TypeScript
│       └── utils.ts             # Validações de URL, slugs e sanitização
├── data/
│   └── links.json               # Armazenamento local automático
├── .env.example
├── vercel.json
├── package.json
└── README.md
```
