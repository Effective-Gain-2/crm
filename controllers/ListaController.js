const XLSX = require('xlsx');
const fs = require('fs');
const { criarListaDePlanilha, getListas, renomearLista, deleteLista } = require('../services/ListaService');

const getListasController = async (req, res) => {
  try {
    const schema = req.schema || req.auth?.schema;
    const listas = await getListas(schema);
    res.status(200).json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    res.status(500).json({ error: 'Erro ao buscar listas' });
  }
};

const uploadListaController = async (req, res) => {
  const schema = req.schema || req.auth?.schema;
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const nome = req.body?.nome;
    if (!nome || !String(nome).trim()) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Informe um nome para a lista.' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const resultado = await criarListaDePlanilha(nome, linhas, schema, req.auth?.local_user_id);
    fs.unlink(req.file.path, () => {});

    let message = `Lista "${resultado.nome}" criada com ${resultado.importados} contato(s).`;
    if (resultado.ignorados > 0) {
      message += ` ${resultado.ignorados} linha(s) ignorada(s) por falta de nome ou número, ou por número repetido.`;
    }

    res.status(201).json({ success: true, message, ...resultado });
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: error.message || 'Erro ao criar lista' });
  }
};

const renomearListaController = async (req, res) => {
  try {
    const schema = req.schema || req.auth?.schema;
    const { lista_id } = req.params;
    const lista = await renomearLista(lista_id, req.body?.nome, schema);
    if (!lista) {
      return res.status(404).json({ error: 'Lista não encontrada' });
    }
    res.status(200).json({ success: true, lista });
  } catch (error) {
    console.error('Erro ao renomear lista:', error);
    res.status(400).json({ error: error.message || 'Erro ao renomear lista' });
  }
};

const deleteListaController = async (req, res) => {
  try {
    const schema = req.schema || req.auth?.schema;
    const { lista_id } = req.params;
    const removida = await deleteLista(lista_id, schema);
    if (!removida) {
      return res.status(404).json({ error: 'Lista não encontrada' });
    }
    res.status(200).json({ success: true, lista: removida });
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    res.status(400).json({ error: error.message || 'Erro ao excluir lista' });
  }
};

module.exports = {
  getListasController,
  uploadListaController,
  renomearListaController,
  deleteListaController,
};
