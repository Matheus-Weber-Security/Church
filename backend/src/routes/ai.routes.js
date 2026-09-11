const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

// Conhecimento especializado de Godolfredo sobre a plataforma
const GODOLFREDO_SYSTEM_KNOWLEDGE = `
Você é o Godolfredo, o anjo guardião e assistente de inteligência artificial oficial do Construtor Visual Web (GrapesJS Studio).
Sua personalidade é afetuosa, paciente, acolhedora, clara e encorajadora. Você usa uma linguagem simples, amigável e direta, com emojis gentis (👼, ✨, 💡, 🚀, 🔒, 📝).

Você conhece todos os detalhes deste sistema:
1. EDIÇÃO DA PÁGINA HOME E CONSTRUTOR VISUAL:
   - A página inicial (Home) começa limpa e pode ser montada arrastando blocos da barra lateral esquerda.
   - Para editar qualquer texto: clique duas vezes sobre ele. Uma barra de ferramentas flutuante (CKEditor) aparecerá com opções de Negrito, Itálico, Alinhamento, Tamanho e Listas.
   - Para trocar cores, fundos e margens: selecione o bloco com um clique e use o painel "Estilos" (pincel) no canto direito.
   - Para adicionar imagens: clique no botão verde "🖼 Galeria / Upload" no topo, selecione uma imagem do seu computador e depois arraste-a para a página.
   - Para criar novas páginas: clique em "+ Nova Página" no topo, dê um título e um endereço amigável (ex: /servicos, /contato).
   - Para ajustar no Celular: clique no botão "📱 Mobile" no topo para ver como fica no smartphone (375px). Estilos aplicados no modo celular ficam salvos especificamente para telas móveis!
   - Para salvar: clique no botão azul "💾 Salvar Página" no topo direito.

2. GERENCIADOR DE PLUGINS:
   - Fica na aba "Plugins" (ícone 🧩) no menu superior preto.
   - O sistema vem com 9 plugins nativos essenciais já instalados:
     1) Webpage Preset (layout e estrutura base)
     2) Blocos Básicos (colunas, tabelas, links, mapas)
     3) Formulários (campos de texto, seletores, botões)
     4) Código Customizado (bloco HTML/CSS/JS livre)
     5) Estilos de Fundo (gradientes e texturas)
     6) Cronômetro Regressivo (dias, horas, minutos)
     7) Abas Interativas (Tabs)
     8) Dicas Flutuantes (Tooltips)
     9) Editor de Rich Text (CKEditor)
   - Proteção de Nativos: Todos os 9 plugins têm o selo "🔒 Nativo do Sistema" e NÃO podem ser excluídos, pois são vitais para a estrutura. Mas você pode DESATIVAR qualquer um usando o botão Liga/Desliga para limpar a barra lateral.
   - Para adicionar um novo plugin: clique em "+ Adicionar Plugin", preencha o Nome, Nome do Pacote (ex: grapesjs-plugin-social), Categoria e a URL do CDN do script (ex: https://unpkg.com/grapesjs-plugin-social@latest). Plugins adicionados por você podem ser excluídos a qualquer momento!

3. CADASTRO E GERENCIAMENTO DE USUÁRIOS:
   - Fica na aba "Usuários" (ícone 👥) no menu superior preto (acessível apenas para Administradores).
   - Para criar um novo usuário: preencha o Usuário, Senha e selecione o Perfil (Admin ou Editor).
   - Diferença de perfis:
     * Admin: Acesso total a tudo, incluindo gerenciar usuários, ver logs de acesso e gerenciar plugins.
     * Editor: Acesso focado na edição de páginas e conteúdo visual, sem permissão para criar usuários ou auditar logs.
   - Logs de Acesso: Registram data, hora, usuário, IP e ação realizada para segurança e auditoria.

4. DÚVIDAS COMUNS E DICAS RÁPIDAS:
   - Botão para WhatsApp: selecione o botão, abra a engrenagem (⚙️) no painel direito e coloque no link (Href): https://wa.me/55DDDSEUNUMERO (exemplo: https://wa.me/5511999998888) e marque Target como _blank.
   - Teclas de Atalho: Ctrl+Z para desfazer, Ctrl+Y para refazer, Ctrl+D para duplicar e Delete para apagar elemento selecionado.
`;

// Respostas inteligentes baseadas em intenção para funcionamento 100% autônomo e imediato
function getKnowledgeBaseResponse(userMessage) {
  const q = userMessage.toLowerCase().trim();

  // 1. Dúvidas sobre Plugins
  if (q.includes('plugin') || q.includes('extens') || q.includes('adicionar plugin') || q.includes('remover plugin')) {
    if (q.includes('como adicionar') || q.includes('novo plugin') || q.includes('instalar') || q.includes('cadastrar')) {
      return `Olá! Aqui é o **Godolfredo** 👼✨ 

Adicionar um novo plugin ao seu sistema é super simples:

1. Acesse a aba **Plugins** (ícone 🧩) no menu superior preto.
2. Clique no botão roxo **"+ Adicionar Plugin"** no canto superior direito.
3. Preencha os campos da janela:
   - **Nome do Plugin:** Um nome fácil de reconhecer (ex: *Compartilhamento em Redes Sociais*).
   - **Nome do Pacote:** O identificador no NPM (ex: \`grapesjs-plugin-social\`).
   - **Categoria:** Escolha onde ele se encaixa melhor (Mídia, Estilos, Formulários, etc.).
   - **URL do CDN:** O link direto do script \`.js\` (ex: \`https://unpkg.com/grapesjs-plugin-social@latest\`).
4. Clique em **"Cadastrar Plugin"**.

💡 **Dica de Ouro:** Depois de cadastrar ou alterar plugins, salve sua página e recarregue a aba do navegador para que os novos blocos apareçam no editor!`;
    }

    if (q.includes('excluir') || q.includes('apagar') || q.includes('nativo') || q.includes('proteg')) {
      return `Oi! O **Godolfredo** aqui para te explicar com carinho 👼🔒:

O nosso sistema possui **9 Plugins Nativos** que vêm pré-instalados:
- *Webpage Preset, Blocos Básicos, Formulários, Código Customizado, Estilos de Fundo, Cronômetro Regressivo, Abas, Tooltips e CKEditor*.

**Por que eles não podem ser excluídos?**
Eles são a estrutura fundamental do construtor de páginas! Para garantir que o editor nunca pare de funcionar por acidente, eles são protegidos permanentemente.

✨ **O que você pode fazer:**
Se você não quiser que esses blocos fiquem aparecendo na sua barra lateral, basta **desligar o switch Liga/Desliga** na tabela de Plugins. O plugin fica desativado sem precisar ser deletado!`;
    }

    return `Olá! O **Godolfredo** te ajuda com os plugins 👼🧩:

No painel de **Plugins** (ícone 🧩 no menu superior), você pode:
- **Ver os 9 Plugins Nativos:** Todos pré-configurados e protegidos com selo 🔒.
- **Ligar ou Desligar:** Use o switch para ocultar blocos que não vai usar e deixar sua barra lateral mais limpa.
- **Adicionar Novos Plugins:** Clique em **"+ Adicionar Plugin"** para integrar qualquer pacote da comunidade GrapesJS informando a URL do script CDN.

Quer saber como adicionar um plugin específico ou como funciona algum dos 9 nativos? É só me perguntar! ✨`;
  }

  // 2. Dúvidas sobre Usuários
  if (q.includes('usuário') || q.includes('usuario') || q.includes('cadastro') || q.includes('senha') || q.includes('admin') || q.includes('editor') || q.includes('permiss')) {
    return `Paz e bem! Sou o **Godolfredo** e vou te explicar sobre o gerenciamento de usuários 👼👥:

Como **Administrador**, você tem controle total sobre quem acessa o painel:

### 📝 Como Cadastrar um Novo Usuário:
1. No menu superior preto, clique na aba **"Usuários"** (ícone 👥).
2. Na seção **"Criar Novo Usuário"**, preencha:
   - **Nome de Usuário:** (ex: \`joao.editor\` ou \`maria\`).
   - **Senha:** Digite uma senha segura.
   - **Perfil / Permissão:** Escolha entre **Admin** ou **Editor**.
3. Clique no botão azul **"Criar Usuário"**.

### 🛡️ Qual a diferença entre os perfis?
- **Admin (Administrador):** Tem acesso completo a tudo! Pode editar páginas, gerenciar plugins, cadastrar ou excluir outros usuários e auditar os logs de acesso.
- **Editor:** Tem acesso exclusivo à edição das páginas e conteúdos visuais. Não tem acesso à criação de usuários nem aos registros de logs, garantindo total segurança.

💡 **Segurança:** Todas as senhas são criptografadas com tecnologia *bcrypt* e os logins são monitorados na aba **Logs de Acesso**!`;
  }

  // 3. Dúvidas sobre Edição da Página Home e Construtor Visual
  if (q.includes('home') || q.includes('edit') || q.includes('texto') || q.includes('imagem') || q.includes('foto') || q.includes('bloco') || q.includes('cor') || q.includes('salvar') || q.includes('pagina') || q.includes('página') || q.includes('mobile') || q.includes('celular') || q.includes('responsiv') || q.includes('smartphone')) {
    if (q.includes('texto') || q.includes('escrever') || q.includes('fonte') || q.includes('ckeditor')) {
      return `Com certeza! O **Godolfredo** te ensina a editar textos num piscar de olhos 👼✍️:

1. **Clique duas vezes (duplo clique)** sobre qualquer texto no canvas central.
2. Uma barra flutuante moderna (**CKEditor**) se abrirá imediatamente sobre o texto.
3. Você pode:
   - Colocar em **Negrito**, *Itálico* ou Sublinhado.
   - Criar listas com marcadores ou numeradas.
   - Mudar o alinhamento (Esquerda, Centro, Direita).
4. Para alterar a **cor da fonte** ou o **tamanho**:
   - Dê um clique simples no texto e olhe no painel da direita (no ícone de **Pincel / Estilos**).
   - Em *Tipografia*, você pode escolher a cor exata e o tamanho em pixels.

Ao terminar, nunca se esqueça de clicar no botão azul **💾 Salvar Página** no topo direito! ✨`;
    }

    if (q.includes('imagem') || q.includes('foto') || q.includes('banner') || q.includes('upload')) {
      return `Que maravilha! O **Godolfredo** te mostra como subir fotos lindas para o seu site 👼🖼️:

1. No topo do editor, clique no botão verde **"🖼 Galeria / Upload"**.
2. Na janela que abrir, você pode:
   - Ver todas as imagens que já foram enviadas.
   - Clicar no botão para selecionar uma nova foto do seu computador.
3. Para usar a foto na página:
   - Selecione a foto na galeria para aplicá-la, ou simplesmente arraste o bloco de **Imagem** da barra lateral para o local desejado e escolha a imagem enviada!

💡 **Dica:** Fotos em formato JPG ou WebP de até 5MB garantem carregamento super rápido para os visitantes! ✨`;
    }

    if (q.includes('mobile') || q.includes('celular') || q.includes('responsiv') || q.includes('smartphone')) {
      return `Excelente pergunta! O **Godolfredo** cuida para seu site ficar perfeito em qualquer aparelho 👼📱:

1. No topo da tela do editor, você verá os botões **💻 Desktop** e **📱 Mobile**.
2. Clique em **📱 Mobile**: a tela central se ajustará automaticamente para a largura de um smartphone (375px).
3. Agora você pode ajustar os tamanhos de fontes, margens e espaçamentos especificamente para celular!
4. Todas as alterações feitas enquanto o modo celular estiver ativo serão aplicadas somente em telas móveis, preservando o visual perfeito do computador.

Dessa forma, seu visitante terá uma experiência incrível no celular e no PC! ✨`;
    }

    if (q.includes('salvar') || q.includes('publicar')) {
      return `Oi! É muito importante salvar seu trabalho com segurança 👼💾:

- No canto superior direito da tela do editor, você verá o botão azul em destaque: **💾 Salvar Página**.
- Basta dar um clique nele! O sistema grava o HTML, CSS e toda a estrutura do projeto diretamente no banco de dados SQLite.
- Uma notificação verde de confirmação aparecerá e qualquer pessoa que acessar seu site já verá a nova versão no mesmo instante! ✨`;
    }

    return `Olá! O **Godolfredo** te guia pela edição da Home 👼🏠:

Editar a página inicial é simples e divertido através do método **Arrastar e Soltar**:

1. **Adicionar Seções:** Abra a barra lateral esquerda (ícone de cubos 📦) e arraste blocos prontos como *Navbar*, *Hero Banner*, *Grade de Colunas* ou *Rodapé*.
2. **Alterar Textos:** Dê um duplo clique no texto para abrir a barra de formatação (CKEditor).
3. **Mudar Imagens:** Clique no botão verde **"🖼 Galeria / Upload"** no topo para enviar fotos do seu computador.
4. **Ver no Celular:** Clique em **"📱 Mobile"** no topo para conferir a visualização em smartphones.
5. **Publicar:** Clique em **"💾 Salvar Página"** no topo direito.

O que você gostaria de alterar agora? Posso te guiar passo a passo! ✨`;
  }

  // 4. WhatsApp
  if (q.includes('whatsapp') || q.includes('zap') || q.includes('link')) {
    return `Com a bênção de Deus e a ajuda do **Godolfredo**, criar um botão para WhatsApp é super fácil 👼💬:

1. Clique sobre o botão que você deseja vincular ao WhatsApp.
2. No painel direito, clique no ícone da **Engrenagem (⚙️ - Configurações / Traits)**.
3. No campo **Link / Href**, digite o endereço padrão da API do WhatsApp:
   \`https://wa.me/55DDDSEUNUMERO\`
   *(Exemplo para São Paulo com DDD 11: \`https://wa.me/5511999998888\`)*
4. No campo **Target**, escolha **\`_blank\`** para que a conversa abra em uma nova aba sem fechar o site do visitante!
5. Clique em **💾 Salvar Página**.

Prontinho! Quando o visitante clicar no botão, ele será direcionado direto para o chat do seu WhatsApp! ✨`;
  }

  // 5. Saudação ou quem é Godolfredo
  if (q.includes('quem é você') || q.includes('quem e voce') || q.includes('quem e') || q.includes('godolfredo') || q.includes('ola') || q.includes('olá') || q.includes('oi') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite')) {
    return `Olá! Que alegria falar com você! Eu sou o **Godolfredo**, seu anjo guardião e assistente inteligente aqui no construtor de páginas 👼✨

Estou aqui para te ajudar em tudo o que você precisar:
- 🎨 **Edição da Home e Páginas:** Como usar blocos, editar textos com duplo clique, trocar fotos e cores.
- 🧩 **Gerenciador de Plugins:** Como ativar/desativar plugins nativos e cadastrar novas ferramentas.
- 👥 **Usuários e Acessos:** Como criar usuários, senhas e entender permissões de Admin e Editor.
- 📱 **Modo Mobile e Dicas:** Como deixar o site perfeito no celular e links para WhatsApp.

Como posso te ajudar hoje? Pode me fazer qualquer pergunta! ✨`;
  }

  // Resposta padrão gentil e contextual
  return `Olá! Aqui é o **Godolfredo**, seu anjo assistente 👼✨

Entendi sua dúvida sobre: *"${userMessage}"*.

Para que eu possa te dar a resposta mais precisa, você gostaria de ajuda sobre:
1. **Edição de Páginas (GrapesJS):** Como mudar textos, fotos, cores, blocos e salvar a Home?
2. **Gerenciador de Plugins:** Como ligar/desligar os 9 plugins nativos ou cadastrar novos via CDN?
3. **Gestão de Usuários:** Como criar novos usuários com perfil Admin ou Editor e ver logs?
4. **Configuração de Links:** Como colocar botões de WhatsApp, menus ou links externos?

Me dê mais detalhes do que você gostaria de fazer no site que eu te guio passo a passo com muita alegria! 💡`;
}

// Endpoint POST /api/ai/chat
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A mensagem é obrigatória.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Se houver GEMINI_API_KEY configurada, podemos chamar o modelo Gemini
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const contents = [
          {
            role: 'user',
            parts: [{ text: `${GODOLFREDO_SYSTEM_KNOWLEDGE}\n\nPergunta do Usuário: ${message}` }]
          }
        ];

        const response = await axios.post(geminiUrl, { contents }, { timeout: 10000 });
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          return res.json({
            reply: text,
            source: 'gemini',
            author: 'Godolfredo'
          });
        }
      } catch (geminiErr) {
        console.warn('Falha na API externa Gemini, usando Base de Conhecimento do Godolfredo:', geminiErr.message);
      }
    }

    // Motor de Conhecimento Especializado e Instantâneo do Godolfredo
    const reply = getKnowledgeBaseResponse(message);
    return res.json({
      reply,
      source: 'knowledge_base',
      author: 'Godolfredo'
    });

  } catch (err) {
    console.error('Erro na rota de IA do Godolfredo:', err);
    return res.status(500).json({
      error: 'Erro interno ao consultar o assistente Godolfredo.',
      reply: 'Oi, houve uma pequena oscilação momentânea! Por favor, pergunte novamente em alguns segundos. 👼'
    });
  }
});

module.exports = router;
