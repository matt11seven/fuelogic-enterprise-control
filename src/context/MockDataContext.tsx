import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TankData } from '@/types/api';

// Interface para representar os dados mock
interface MockData {
  [key: string]: {
    expectedSales: number;
    expectedDelivery: number;
  };
}

// Interface para o contexto
interface MockDataContextType {
  mockData: MockData;
  getMockDataForTank: (stationId: string, tankId: string) => { expectedSales: number; expectedDelivery: number };
  generateMockDataForStations: <T extends { id: string; tanks: Array<{ id: string }> }>(stations: T[]) => void;
}

// Criar o contexto
const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Provider component
interface MockDataProviderProps {
  children: ReactNode;
}

export const MockDataProvider: React.FC<MockDataProviderProps> = ({ children }) => {
  const [mockData, setMockData] = useState<MockData>({});
  
  // Função para gerar dados mock para um tanque específico
  const generateMockDataForTank = (stationId: string, tankId: string) => {
    const key = `${stationId}-${tankId}`;
    
    if (!mockData[key]) {
      return {
        expectedSales: Math.floor(Math.random() * 2000) + 500, // Entre 500 e 2500 L
        expectedDelivery: Math.random() > 0.6 ? (Math.random() > 0.5 ? 5000 : 10000) : 0 // 40% de chance de ter recebimento previsto (5000 ou 10000)
      };
    }
    
    return mockData[key];
  };
  
  // Função para obter dados mock para um tanque
  const getMockDataForTank = (stationId: string, tankId: string) => {
    const key = `${stationId}-${tankId}`;
    
    // Se já existe, retornar os dados existentes
    if (mockData[key]) {
      return mockData[key];
    }
    
    // Se não existe, gerar novos dados
    const newData = generateMockDataForTank(stationId, tankId);
    setMockData(prev => ({
      ...prev,
      [key]: newData
    }));
    
    return newData;
  };
  
  // Função para gerar dados mock para todas as estações
  const generateMockDataForStations = <T extends { id: string; tanks: Array<{ id: string }> }>(stations: T[]) => {
    // Primeiro verifica se já tem todos os dados
    let needsUpdate = false;
    const newMockData = { ...mockData };
    
    stations.forEach(station => {
      station.tanks.forEach(tank => {
        const key = `${station.id}-${tank.id}`;
        if (!mockData[key]) {
          needsUpdate = true;
          newMockData[key] = {
            expectedSales: Math.floor(Math.random() * 2000) + 500, // Entre 500 e 2500 L
            expectedDelivery: Math.random() > 0.6 ? (Math.random() > 0.5 ? 5000 : 10000) : 0 // 40% de chance de ter recebimento previsto (5000 ou 10000)
          };
        }
      });
    });
    
    if (needsUpdate) {
      setMockData(newMockData);
    }
  };
  
  const value = {
    mockData,
    getMockDataForTank,
    generateMockDataForStations
  };
  
  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
};

// Hook para usar o contexto
export const useMockData = () => {
  const context = useContext(MockDataContext);
  
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  
  return context;
};
