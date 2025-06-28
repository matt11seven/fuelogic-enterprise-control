/**
 * Rotas de API para gerenciar contatos
 */
const express = require('express');
const router = express.Router();
const Contact = require('../../models/contact');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticação para todas as rotas de contatos
router.use(authenticateToken);

/**
 * @route GET /api/contacts
 * @desc Buscar todos os contatos do usuário
 * @access Privado
 */
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.findAll(req.user.id);
    res.json(contacts);
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({ message: 'Erro ao buscar contatos', error: error.message });
  }
});

/**
 * @route GET /api/contacts/search
 * @desc Buscar contatos por termo de pesquisa
 * @access Privado
 */
router.get('/search', async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ message: 'Termo de busca é obrigatório' });
    }
    
    const contacts = await Contact.search(term, req.user.id);
    res.json(contacts);
  } catch (error) {
    console.error('Erro ao pesquisar contatos:', error);
    res.status(500).json({ message: 'Erro ao pesquisar contatos', error: error.message });
  }
});

/**
 * @route GET /api/contacts/filter/:type
 * @desc Filtrar contatos por tipo
 * @access Privado
 */
router.get('/filter/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!type) {
      return res.status(400).json({ message: 'Tipo é obrigatório' });
    }
    
    const contacts = await Contact.filterByType(type, req.user.id);
    res.json(contacts);
  } catch (error) {
    console.error('Erro ao filtrar contatos:', error);
    res.status(500).json({ message: 'Erro ao filtrar contatos', error: error.message });
  }
});

/**
 * @route GET /api/contacts/:id
 * @desc Buscar um contato por ID
 * @access Privado
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id, req.user.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Contato não encontrado' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('Erro ao buscar contato:', error);
    res.status(500).json({ message: 'Erro ao buscar contato', error: error.message });
  }
});

/**
 * @route POST /api/contacts
 * @desc Criar um novo contato
 * @access Privado
 */
router.post('/', async (req, res) => {
  try {
    const contactData = req.body;
    
    // Validação básica
    if (!contactData.nome || !contactData.telefone || !contactData.tipo) {
      return res.status(400).json({ message: 'Nome, telefone e tipo são obrigatórios' });
    }
    
    const newContact = await Contact.create(contactData, req.user.id);
    res.status(201).json(newContact);
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    res.status(500).json({ message: 'Erro ao criar contato', error: error.message });
  }
});

/**
 * @route PUT /api/contacts/:id
 * @desc Atualizar um contato existente
 * @access Privado
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    
    // Validação básica
    if (!contactData.nome || !contactData.telefone || !contactData.tipo) {
      return res.status(400).json({ message: 'Nome, telefone e tipo são obrigatórios' });
    }
    
    const updatedContact = await Contact.update(id, contactData, req.user.id);
    res.json(updatedContact);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erro ao atualizar contato', error: error.message });
  }
});

/**
 * @route DELETE /api/contacts/:id
 * @desc Realizar soft delete em um contato
 * @access Privado
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Contact.delete(id, req.user.id);
    
    if (!success) {
      return res.status(404).json({ message: 'Contato não encontrado' });
    }
    
    res.json({ message: 'Contato removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover contato:', error);
    res.status(500).json({ message: 'Erro ao remover contato', error: error.message });
  }
});



module.exports = router;
