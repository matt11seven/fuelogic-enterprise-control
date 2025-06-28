/**
 * Script para aplicar as correções necessárias para suportar webhooks da IA Sophia
 */
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de rotas do webhook
const webhookRoutesPath = path.join(__dirname, '../src/routes/webhooks.js');
const webhookModelPath = path.join(__dirname, '../models/webhook.js');

// Função para aplicar as correções
async function applyFixes() {
  try {
    console.log('Iniciando aplicação das correções...');
    
    // 1. Corrigir o arquivo de rotas
    await fixRoutesFile();
    
    // 2. Corrigir o arquivo do modelo
    await fixModelFile();
    
    console.log('Correções aplicadas com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar correções:', error);
  }
}

// Função para corrigir o arquivo de rotas
async function fixRoutesFile() {
  try {
    console.log(`Atualizando ${webhookRoutesPath}...`);
    
    // Ler o arquivo
    let content = fs.readFileSync(webhookRoutesPath, 'utf8');
    
    // 1. Corrigir validação de integração
    content = content.replace(
      /if\s*\(integration\s*!==\s*'generic'\s*&&\s*integration\s*!==\s*'slingflow'\)\s*{/,
      "if (integration !== 'generic' && integration !== 'slingflow' && integration !== 'sophia_ai') {"
    );
    
    // 2. Corrigir validação de tipo de evento
    content = content.replace(
      /if\s*\(type\s*!==\s*'inspection_alert'\s*&&\s*type\s*!==\s*'order_placed'\s*&&\s*type\s*!==\s*'sophia'\)\s*{/,
      "if (type !== 'inspection_alert' && type !== 'order_placed' && type !== 'sophia' && type !== 'sophia_ai_order') {"
    );
    
    // 3. Adicionar validação específica para webhooks sophia_ai
    content = content.replace(
      /if\s*\(integration\s*===\s*'slingflow'.+?}\s*\n/s,
      match => match + "\n    if (integration === 'sophia_ai' && !url) {\n      return res.status(400).json({ message: 'URL é obrigatória para webhooks da IA Sophia' });\n    }\n"
    );
    
    // Salvar as alterações
    fs.writeFileSync(webhookRoutesPath, content, 'utf8');
    console.log('Arquivo de rotas atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar arquivo de rotas:', error);
    throw error;
  }
}

// Função para corrigir o arquivo do modelo
async function fixModelFile() {
  try {
    console.log(`Atualizando ${webhookModelPath}...`);
    
    // Ler o arquivo
    let content = fs.readFileSync(webhookModelPath, 'utf8');
    
    // 1. Adicionar validação para sophia_ai no método create
    content = content.replace(
      /\/\/ Se for SlingFlow.+?}\s*\n/s,
      match => match + "\n      // Se for Sophia AI, precisa ter URL\n      if (webhookData.integration === 'sophia_ai' && !webhookData.url) {\n        throw new Error('URL é obrigatória para webhooks da IA Sophia');\n      }\n"
    );
    
    // 2. Adicionar validação para sophia_ai no método update
    const updateMethodPattern = /static\s+async\s+update\s*\([^)]+\)\s*{[^}]+if\s*\(webhookData\.integration\s*===\s*'slingflow'[^}]+}/s;
    if (updateMethodPattern.test(content)) {
      content = content.replace(
        updateMethodPattern,
        match => {
          const slingflowValidationEnd = match.lastIndexOf('}');
          return match.substring(0, slingflowValidationEnd + 1) + "\n\n      // Se for Sophia AI, precisa ter URL\n      if (webhookData.integration === 'sophia_ai' && !webhookData.url) {\n        throw new Error('URL é obrigatória para webhooks da IA Sophia');\n      }";
        }
      );
    }
    
    // Salvar as alterações
    fs.writeFileSync(webhookModelPath, content, 'utf8');
    console.log('Arquivo do modelo atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar arquivo do modelo:', error);
    throw error;
  }
}

// Executar as correções
applyFixes();
