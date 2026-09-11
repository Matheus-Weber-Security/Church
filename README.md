# Church - Plataforma Web (React + Node.js + SQLite + GrapesJS Ultimate)

Plataforma web completa desenvolvida para criação e gestão de sites institucionais, com frontend em React e backend em Node.js com SQLite, autenticação JWT, controle de permissões (Roles), **construtor visual GrapesJS completo** e **Apostila/Manual do Usuário em PDF**.

---

## 📖 Apostila e Manual do Usuário (PDF / Impressão)

Criamos uma apostila completa, ilustrada e 100% genérica (white-label) para ser entregue ao usuário final sem necessidade de treinamento técnico prévio:
- **Arquivo físico no projeto:** `e:\Projetos\Church\manual_do_usuario.html`
- **Acesso direto via navegador:** [http://localhost:5000/manual](http://localhost:5000/manual)
- **Botão no Painel Administrativo:** No menu superior do `/edit`, há um botão direto **"Manual (PDF)"** com ícone de livro.
- **Para salvar em PDF:** Basta abrir o link no navegador e clicar no botão azul no topo **"Salvar como PDF / Imprimir"** (ou pressionar <kbd>Ctrl</kbd> + <kbd>P</kbd>).

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Backend
```bash
cd backend
npm install
npm run dev
```
O servidor iniciará em `http://localhost:5000`.

### 2. Iniciar o Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
A aplicação abrirá em `http://localhost:5173`.

---

## 🔑 Credenciais Iniciais de Administrador
- **Usuário:** `root`
- **Senha:** `C1234`
- **Role:** `admin`

---

## 🎨 Recursos do Construtor Visual

1. **Upload Direto no Asset Manager (Multer):** Envio e seleção de fotos do computador para a galeria.
2. **Gerenciador de Múltiplas Páginas:** Criação de novas rotas (ex: `/sobre`, `/servicos`, `/contato`) e seletor no topo do editor.
3. **Editor de Rich Text Avançado (CKEditor):** Formatação com duplo clique nos textos.
4. **Suíte Completa de Plugins:** Formulários, Cronômetro Regressivo, Abas, Tooltips, Custom Code e Controles Avançados de Background.
5. **Design Responsivo:** Visualização e ajuste em Desktop, Tablet e Mobile.
