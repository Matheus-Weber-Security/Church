const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

const uploadDir = process.env.UPLOADS_PATH || path.resolve(__dirname, '../../uploads');

// Garante que o diretório de uploads exista na inicialização
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento com nomes únicos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de tipos permitidos
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens (JPEG, PNG, GIF, WEBP, SVG) são permitidas.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // Limite de 15MB por foto
});

/**
 * GET /api/uploads
 * Retorna lista de todas as imagens já enviadas para alimentar o Asset Manager do GrapesJS
 */
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const files = fs.readdirSync(uploadDir);
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;

    const assets = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase().replace('.', '');
        return ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg'].includes(ext);
      })
      .map((file) => {
        const url = `${protocol}://${host}/uploads/${file}`;
        return {
          src: url,
          name: file,
          filename: file,
          type: 'image'
        };
      });

    // Retorna no formato nativo esperado pelo GrapesJS Asset Manager
    return res.json({ data: assets });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    return res.status(500).json({ error: 'Erro ao carregar galeria de fotos.' });
  }
});

/**
 * POST /api/uploads
 * Recebe arquivos do GrapesJS via multipart/form-data
 * Protegido com autenticação JWT (admin ou editor)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'editor']),
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite máximo é de 15MB por foto.' });
          }
          return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Erro ao processar imagem.' });
      }
      next();
    });
  },
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
      }

      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;

      const uploadedAssets = req.files.map((file) => {
        const url = `${protocol}://${host}/uploads/${file.filename}`;
        return {
          src: url,
          name: file.originalname || file.filename,
          filename: file.filename,
          type: 'image'
        };
      });

      return res.json({
        data: uploadedAssets,
        assets: uploadedAssets,
        message: `${req.files.length} imagem(ns) enviada(s) com sucesso.`
      });
    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar arquivo no servidor.' });
    }
  }
);

/**
 * DELETE /api/uploads/:filename
 * Remove uma imagem do servidor com busca flexível e idempotente
 */
router.delete('/:filename', authMiddleware, roleMiddleware(['admin', 'editor']), (req, res) => {
  const { filename } = req.params;
  const rawBase = path.basename(filename);
  const filePath = path.join(uploadDir, rawBase);

  try {
    // 1. Checagem direta pelo nome exato informado
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ message: 'Imagem excluída com sucesso.', deleted: true });
    }

    // 2. Busca flexível caso o nome recebido seja o nome original (ex: 'flor.jpg' vs 'flor-172635...jpg')
    const ext = path.extname(rawBase).toLowerCase();
    const cleanBaseName = path.basename(rawBase, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const matched = files.find((f) => {
        const fExt = path.extname(f).toLowerCase();
        const fBase = path.basename(f, fExt).toLowerCase();
        return fExt === ext && (fBase === cleanBaseName || fBase.startsWith(`${cleanBaseName}-`));
      });

      if (matched) {
        const matchedPath = path.join(uploadDir, matched);
        if (fs.existsSync(matchedPath)) {
          fs.unlinkSync(matchedPath);
          return res.json({ message: 'Imagem excluída com sucesso.', deleted: true, file: matched });
        }
      }
    }

    // 3. Se não encontrar o arquivo no disco, responde informando que já foi removido (idempotência)
    return res.json({ message: 'Imagem não encontrada no servidor (já havia sido removida).', deleted: false });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return res.status(500).json({ error: 'Erro ao remover imagem do servidor.' });
  }
});

module.exports = router;
