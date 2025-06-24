export interface TankData {
  Id: number;
  Cliente: string;
  Unidade: string;
  Tanque: number;
  Produto: string;
  QuantidadeAtual: number;
  QuantidadeAtualEmMetrosCubicos: number;
  QuantidadeDeAgua: number;
  QuantidadeVazia: number;
  Temperatura: number;
  DataMedicao: string;
  DataRecebimento: string;
  IndiceDoEquipamento: number;
  NumeroDoTanque: number;
  CapacidadeDoTanque: number;
  CapacidadeDoTanqueMenos10Porcento: number;
  NivelEmPercentual: number;
  NivelEmPercentualComTolerancia: number;
  IdUnidade: number;
}
