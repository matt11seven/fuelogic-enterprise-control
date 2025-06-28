import { TrendingUp } from "lucide-react";
import { useState } from "react";

interface OrderButtonProps {
  selectedCount: number;
  totalLiters?: number;
  onProcessOrder: () => void;
}

const OrderButton = ({ selectedCount, totalLiters = 0, onProcessOrder }: OrderButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (selectedCount === 0) return;
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      onProcessOrder();
      setIsProcessing(false);
    }, 2000);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-full shadow-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            <span>Processando...</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-5 w-5" />
            <span>Processar Pedido ({selectedCount} tanques{totalLiters > 0 ? ` - ${totalLiters.toLocaleString()}L` : ''})</span>
          </>
        )}
      </button>
    </div>
  );
};

export default OrderButton;
