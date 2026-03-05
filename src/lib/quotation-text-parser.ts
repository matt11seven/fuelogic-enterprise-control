export interface ParsedQuotation {
  supplier_name: string;
  product_type: string;
  unit_price: number;
  total_price: number;
  delivery_days: number;
  freight_type: 'FOB' | 'CIF' | '';
  notes: string;
  confidence: 'high' | 'low';
}

function parseBrNumber(s: string): number {
  const clean = s.trim().replace(/\s/g, '');
  // Brazilian format "1.234,56"
  if (/\d\.\d{3},\d/.test(clean)) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  }
  // Simple comma decimal "5,45"
  if (/^\d+,\d+$/.test(clean)) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean) || 0;
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .trim();
}

function parseLineQuotation(line: string, defaultProduct?: string): ParsedQuotation | null {
  // Pattern: "Supplier - Product - R$ 5,45/L - CIF - 3 dias"
  const parts = line.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;

  const supplier = parts[0];

  // Find the price part (contains digits and comma or dot)
  const priceIdx = parts.findIndex((p, i) => i > 0 && /[\d,.]/.test(p.replace(/[R$\s/Ll]/g, '')));
  if (priceIdx < 0) return null;

  const priceStr = parts[priceIdx].replace(/[R$\s/Ll]/g, '');
  const unit_price = parseBrNumber(priceStr);
  if (!unit_price) return null;

  // Product is between supplier and price
  const product = priceIdx > 1 ? parts.slice(1, priceIdx).join(' - ') : (defaultProduct || '');

  // Freight
  const freightPart = parts.find((p) => /^(CIF|FOB)$/i.test(p));
  const freight_type: 'FOB' | 'CIF' | '' = freightPart
    ? (freightPart.toUpperCase() as 'FOB' | 'CIF')
    : '';

  // Days
  const daysPart = parts.find((p) => /\d+\s*dias?/i.test(p));
  const delivery_days = daysPart ? parseInt(daysPart) || 0 : 0;

  return {
    supplier_name: supplier,
    product_type: product,
    unit_price,
    total_price: 0,
    delivery_days,
    freight_type,
    notes: '',
    confidence: supplier && unit_price > 0 ? 'high' : 'low',
  };
}

function parseKVBlock(block: string, defaultProduct?: string): ParsedQuotation | null {
  const kv: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = normalizeKey(line.slice(0, colonIdx));
      kv[key] = line.slice(colonIdx + 1).trim();
    }
  }

  const supplier =
    kv['fornecedor'] || kv['supplier'] || kv['empresa'] || kv['distribuidora'] || '';
  const product =
    kv['produto'] || kv['combustivel'] || kv['product'] || kv['tipo'] || defaultProduct || '';
  const priceRaw =
    kv['preco'] ||
    kv['preco/l'] ||
    kv['price'] ||
    kv['valor'] ||
    kv['preco por litro'] ||
    kv['valor/l'] ||
    '';
  const freightRaw = kv['frete'] || kv['freight'] || kv['modalidade'] || '';
  const daysRaw = kv['prazo'] || kv['dias'] || kv['days'] || kv['entrega'] || '';
  const notes =
    kv['obs'] ||
    kv['notas'] ||
    kv['notes'] ||
    kv['observacoes'] ||
    kv['observacao'] ||
    kv['descricao'] ||
    '';

  if (!supplier && !priceRaw) return null;

  const unit_price = parseBrNumber(priceRaw.replace(/[R$\s/Ll]/g, ''));
  const delivery_days = parseInt(daysRaw) || 0;
  const freightUpper = freightRaw.toUpperCase();
  const freight_type: 'FOB' | 'CIF' | '' =
    freightUpper === 'FOB' ? 'FOB' : freightUpper === 'CIF' ? 'CIF' : '';

  return {
    supplier_name: supplier,
    product_type: product,
    unit_price,
    total_price: 0,
    delivery_days,
    freight_type,
    notes,
    confidence: supplier && unit_price > 0 ? 'high' : 'low',
  };
}

/**
 * Parses pasted quotation text from WhatsApp or manual entry.
 * Supports:
 * - Line format: "Petrobras - Diesel S10 - R$ 5,45/L - CIF - 3 dias"
 * - Block key:value: "Fornecedor: X\nPreço: 5,45\nFrete: CIF\nPrazo: 3"
 * - Multiple quotations separated by blank lines or ---
 */
export function parseQuotationText(
  text: string,
  defaultProduct?: string,
): ParsedQuotation[] {
  const results: ParsedQuotation[] = [];

  // Split by blank lines or --- separators
  const blocks = text
    .split(/\n\s*\n|\n---+\n|^---+\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    // Detect key:value format (multi-line block with colons)
    const lines = block.split('\n').filter((l) => l.trim());
    const kvLines = lines.filter((l) => l.includes(':') && l.indexOf(':') > 0);

    if (kvLines.length >= 2 && lines.length > 1) {
      const parsed = parseKVBlock(block, defaultProduct);
      if (parsed) {
        results.push(parsed);
        continue;
      }
    }

    // Try each line as a separate line-format quotation
    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;
      const parsed = parseLineQuotation(clean, defaultProduct);
      if (parsed) results.push(parsed);
    }
  }

  return results;
}
