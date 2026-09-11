const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');

const uploadDir = path.resolve(__dirname, '../../uploads');

// Configuração de armazenamento com nomes únicos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB por foto
});

/**
 * GET /api/uploads
 * Retorna lista de todas as imagens já enviadas para alimentar o Asset Manager do GrapesJS
 */
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const host = req.get('host');
    const protocol = req.protocol;

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
  upload.array('files', 10),
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const host = req.get('host');
      const protocol = req.protocol;

      const uploadedUrls = req.files.map((file) => {
        return `${protocol}://${host}/uploads/${file.filename}`;
      });

      // O GrapesJS aceita { data: [ 'url1', 'url2' ] } ou array de assets
      return res.json({
        data: uploadedUrls,
        message: `${req.files.length} imagem(ns) enviada(s) com sucesso.`
      });
    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return res.status(500).json({ error: 'Erro ao salvar arquivo.' });
    }
  }
);

/**
 * DELETE /api/uploads/:filename
 * Remove uma imagem do servidor
 */
router.delete('/:filename', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, path.basename(filename));

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ message: 'Imagem excluída com sucesso.' });
    }
    return res.status(404).json({ error: 'Imagem não encontrada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover imagem.' });
  }
});

module.exports = router;
