/**
 * Utilitário centralizado para padronização das cores dos combustíveis em todo o sistema
 */

/**
 * Retorna a classe CSS de cor de fundo correspondente ao código do combustível
 * @param code Código do combustível (ex: GC, GA, S10, etc.)
 * @returns Classe CSS de cor de fundo (ex: bg-red-500)
 */
export const getFuelColor = (code: string): string => {
  // Caso especial para códigos específicos completos
  if (code === 'S10') return 'bg-orange-600';      // Diesel S10 - Laranja escuro
  if (code === 'S10A') return 'bg-orange-500';     // Diesel S10 Aditivado - Laranja claro
  
  // Para outros casos, verificamos o prefixo
  const prefix = code.substring(0, 2).toUpperCase();
  
  switch (prefix) {
    // Gasolinas
    case 'GC': 
    case 'GASOLINA_COMUM':
    case 'GASOLINA COMUM': return 'bg-red-500';      // Gasolina Comum - Vermelho
    
    case 'GA': 
    case 'GG':
    case 'GASOLINA_ADITIVADA':
    case 'GASOLINA_GRID':
    case 'GASOLINA ADITIVADA':
    case 'GASOLINA GRID': return 'bg-blue-500';      // Gasolina Aditivada/Grid - Azul
    
    case 'GP': 
    case 'GASOLINA_PODIUM':
    case 'GASOLINA PODIUM': return 'bg-purple-500';  // Gasolina Podium - Roxo
    
    // Diesel S500 (família âmbar)
    case 'DS': 
    case 'D5':
    case 'DS500':
    case 'DIESEL_COMUM':
    case 'DIESEL_S500':
    case 'DIESEL COMUM':
    case 'DIESEL S500': return 'bg-amber-600';       // Diesel S500 Comum - Âmbar escuro
    
    case 'D5G':
    case 'D5A':
    case 'DS500G': 
    case 'DS500A':
    case 'DIESEL_S500_GRID':
    case 'DIESEL_S500_ADITIVADO':
    case 'DIESEL S500 GRID':
    case 'DIESEL S500 ADITIVADO': return 'bg-amber-500'; // Diesel S500 Grid/Aditivado - Âmbar claro
    
    // Diesel S10 (família laranja)
    case 'D10':
    case 'DS10':
    case 'DIESEL_S10':
    case 'DIESEL S10': return 'bg-orange-600';       // Diesel S10 Comum - Laranja escuro
    
    case 'D10G':
    case 'D10A':
    case 'DS10G': 
    case 'DS10A':
    case 'DIESEL_S10_GRID':
    case 'DIESEL_S10_ADITIVADO':
    case 'DIESEL S10 GRID':
    case 'DIESEL S10 ADITIVADO': return 'bg-orange-500'; // Diesel S10 Grid/Aditivado - Laranja claro
    
    // Outros combustíveis
    case 'ET': 
    case 'ETANOL': return 'bg-green-500';           // Etanol - Verde
    
    case 'AR': 
    case 'ARLA': return 'bg-cyan-500';              // Arla - Ciano
    
    default: return 'bg-slate-500';
  }
};

/**
 * Retorna a cor de texto correspondente ao código do combustível
 * @param code Código do combustível
 * @returns Classe CSS de cor de texto (ex: text-red-500)
 */
export const getFuelTextColor = (code: string): string => {
  const bgColor = getFuelColor(code);
  // Substituímos "bg-" por "text-"
  return bgColor.replace('bg-', 'text-');
};

/**
 * Retorna o nome descritivo do combustível com base no código
 * @param code Código do combustível
 * @returns Nome descritivo do combustível
 */
export const getFuelName = (code: string): string => {
  // Caso especial para códigos específicos completos
  if (code === 'S10') return 'Diesel S10';
  if (code === 'S10A') return 'Diesel S10 Aditivado';
  
  // Para outros casos, verificamos o prefixo
  const prefix = code.substring(0, 2).toUpperCase();
  
  switch (prefix) {
    // Gasolinas
    case 'GC': return 'Gasolina Comum';
    case 'GA': return 'Gasolina Aditivada';
    case 'GG': return 'Gasolina Grid';
    case 'GP': return 'Gasolina Podium';
    
    // Diesel
    case 'DS': return 'Diesel S500';
    case 'D5': return 'Diesel S500';
    case 'D5G': return 'Diesel S500 Grid';
    case 'D5A': return 'Diesel S500 Aditivado';
    case 'D10': return 'Diesel S10';
    case 'DS10': return 'Diesel S10';
    case 'D10G': return 'Diesel S10 Grid';
    case 'D10A': return 'Diesel S10 Aditivado';
    
    // Outros
    case 'ET': return 'Etanol';
    case 'AR': return 'Arla 32';
    
    default: return code;
  }
};
