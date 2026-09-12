const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../database.sqlite');

// Garante que o diretório do banco de dados exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite em:', dbPath);
  }
});

// Helpers para transformar callbacks do sqlite3 em Promises
db.runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Inicialização das tabelas e do usuário root
const initDatabase = async () => {
  try {
    // 1. Tabela de Usuários
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inicialização / Atualização garantida do usuário root primordial
    const rootUser = await db.getAsync('SELECT id FROM users WHERE username = ?', ['root']);
    const rootPasswordHash = bcrypt.hashSync('imec2026', 10);
    if (!rootUser) {
      await db.runAsync(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['root', rootPasswordHash, 'admin']
      );
      console.log('✔ Usuário root inicial criado com sucesso.');
    } else {
      await db.runAsync(
        'UPDATE users SET password_hash = ?, role = ? WHERE username = ?',
        [rootPasswordHash, 'admin', 'root']
      );
      console.log('✔ Senha e permissões do usuário root sincronizadas.');
    }

    // 2. Tabela de Conteúdo da Página Principal (Cards, Fotos, Textos)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS home_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT,
        description TEXT,
        image_url TEXT,
        order_index INTEGER DEFAULT 0,
        published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabela de Logs de Acesso
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Tabela de Páginas do Site (Layouts gerados pelo GrapesJS)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS site_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT,
        html TEXT,
        css TEXT,
        project_data TEXT,
        published INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Tabela de Plugins do GrapesJS
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS plugins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        package_name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT DEFAULT 'Geral',
        is_native INTEGER DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        cdn_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sementes dos 9 plugins nativos do sistema (protegidos contra exclusão)
    const nativePlugins = [
      {
        name: 'Webpage Preset',
        package_name: 'grapesjs-preset-webpage',
        description: 'Estrutura base de páginas web, modal de importação de código e canvas responsivo.',
        category: 'Estrutura'
      },
      {
        name: 'Blocos Básicos',
        package_name: 'grapesjs-blocks-basic',
        description: 'Colunas flexíveis, tabelas, textos, links, imagens, vídeos e mapas.',
        category: 'Estrutura'
      },
      {
        name: 'Formulários',
        package_name: 'grapesjs-plugin-forms',
        description: 'Componentes avançados de formulários: inputs, textareas, selects, checkboxes, radios e botões.',
        category: 'Formulários'
      },
      {
        name: 'Código Customizado',
        package_name: 'grapesjs-custom-code',
        description: 'Bloco para inserção de código HTML, CSS e scripts livres via modal interativo.',
        category: 'Avançado'
      },
      {
        name: 'Estilos de Fundo (Style BG)',
        package_name: 'grapesjs-style-bg',
        description: 'Controles visuais avançados no painel de estilos para gradientes lineares, radiais e imagens.',
        category: 'Estilos'
      },
      {
        name: 'Cronômetro Regressivo',
        package_name: 'grapesjs-component-countdown',
        description: 'Cronômetro regressivo dinâmico com contagem de dias, horas, minutos e segundos para eventos.',
        category: 'Mídia & Dinâmico'
      },
      {
        name: 'Abas Interativas (Tabs)',
        package_name: 'grapesjs-tabs',
        description: 'Sistema completo de navegação por abas com conteúdo modular e dinâmico.',
        category: 'Navegação'
      },
      {
        name: 'Dicas Flutuantes (Tooltips)',
        package_name: 'grapesjs-tooltip',
        description: 'Criação de dicas contextuais ativadas ao passar o cursor do mouse sobre qualquer elemento.',
        category: 'Interativo'
      },
      {
        name: 'Editor de Rich Text (CKEditor)',
        package_name: 'grapesjs-plugin-ckeditor',
        description: 'Barra de ferramentas de formatação rica de texto (WYSIWYG) ao dar duplo clique.',
        category: 'Tipografia'
      }
    ];

    for (const p of nativePlugins) {
      const exists = await db.getAsync('SELECT id FROM plugins WHERE package_name = ?', [p.package_name]);
      if (!exists) {
        await db.runAsync(
          `INSERT INTO plugins (name, package_name, description, category, is_native, is_enabled)
           VALUES (?, ?, ?, ?, 1, 1)`,
          [p.name, p.package_name, p.description, p.category]
        );
      }
    }

    console.log('✔ Banco de dados, tabelas e plugins nativos inicializados com sucesso.');
  } catch (error) {
    console.error('Erro na inicialização do banco de dados:', error);
  }
};

module.exports = {
  db,
  initDatabase
};
