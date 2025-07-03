/**
 * Utilitário centralizado para mapear nomes de produtos para códigos de combustível
 */

interface ProductInfo {
  code: string;
  name: string;
}

// Mapeamento de nomes de produtos para códigos e nomes padronizados
const productMap: Record<string, ProductInfo> = {
  // Gasolinas
  'GASOLINA COMUM': { code: 'GC', name: 'Gasolina Comum' },
  'GASOLINA GRID': { code: 'GA', name: 'Gasolina Aditivada' },
  'GASOLINA ADITIVADA': { code: 'GA', name: 'Gasolina Aditivada' },
  'GASOLINA PODIUM': { code: 'GP', name: 'Gasolina Podium' },
  ' GASOLINA PODIUM': { code: 'GP', name: 'Gasolina Podium' }, // Espaço extra
  'GC': { code: 'GC', name: 'Gasolina Comum' },
  'GA': { code: 'GA', name: 'Gasolina Aditivada' },
  'GP': { code: 'GP', name: 'Gasolina Podium' },
  
  // Diesel S500 (família âmbar)
  'DIESEL COMUM': { code: 'DS', name: 'Diesel S500' },
  'DIESEL S500': { code: 'DS', name: 'Diesel S500' },
  'DIESEL COMUM GRID': { code: 'DSA', name: 'Diesel S500 Grid' },
  'DIESEL COMUM ADITIVADO': { code: 'DSA', name: 'Diesel S500 Aditivado' },
  'DIESEL S500 GRID': { code: 'DSA', name: 'Diesel S500 Grid' },
  'DIESEL S500 ADITIVADO': { code: 'DSA', name: 'Diesel S500 Aditivado' },
  'DS': { code: 'DS', name: 'Diesel S500' },
  'DSA': { code: 'DSA', name: 'Diesel S500 Aditivado' },
  
  // Diesel S10 (família laranja)
  'DIESEL S10': { code: 'S10', name: 'Diesel S10' },
  'DIESEL S10 GRID': { code: 'S10A', name: 'Diesel S10 Grid' },
  'DIESEL S10 ADITIVADO': { code: 'S10A', name: 'Diesel S10 Aditivado' },
  'S10': { code: 'S10', name: 'Diesel S10' },
  'S10A': { code: 'S10A', name: 'Diesel S10 Aditivado' },
  
  // Etanol
  'ETANOL': { code: 'ET', name: 'Etanol' },
  'ETANOL ADITIVADO': { code: 'ETA', name: 'Etanol Aditivado' },
  'ET': { code: 'ET', name: 'Etanol' },
  'ETA': { code: 'ETA', name: 'Etanol Aditivado' },
  
  // Arla (AdBlue)
  'ARLA': { code: 'AR', name: 'Arla 32' },
  'ARLA 32': { code: 'AR', name: 'Arla 32' },
  'ADBLUE': { code: 'AR', name: 'AdBlue' },
  'AR': { code: 'AR', name: 'Arla 32' },
  
  // GNV
  'GNV': { code: 'GNV', name: 'Gás Natural Veicular' },
};

/**
 * Obtém informações padronizadas sobre um produto com base em seu nome ou código
 * @param productNameOrCode Nome ou código do produto
 * @returns Informações padronizadas do produto (código e nome)
 */
export function getProductInfo(productNameOrCode: string): ProductInfo {
  // Normalizar input para maiúsculas e remover espaços extras
  const normalizedInput = productNameOrCode.trim().toUpperCase();
  
  // Verificar se temos um mapeamento direto
  if (productMap[normalizedInput]) {
    return productMap[normalizedInput];
  }
  
  // Tentar mapear com base nos primeiros caracteres (para casos como S10, GC, etc)
  const prefix = normalizedInput.substring(0, 2);
  if (productMap[prefix]) {
    return productMap[prefix];
  }
  
  // Se não encontrou, retornar código genérico
  return { code: 'XX', name: productNameOrCode };
}

/**
 * Obtém o código padronizado do combustível com base no nome ou código informado
 * @param productNameOrCode Nome ou código do produto
 * @returns Código padronizado do combustível
 */
export function getProductCode(productNameOrCode: string): string {
  return getProductInfo(productNameOrCode).code;
}

/**
 * Obtém o nome padronizado do combustível com base no nome ou código informado
 * @param productNameOrCode Nome ou código do produto
 * @returns Nome padronizado do combustível
 */
export function getProductName(productNameOrCode: string): string {
  return getProductInfo(productNameOrCode).name;
}
