
import { TrendingUp } from "lucide-react";
import { useState } from "react";

interface OrderButtonProps {
  selectedCount: number;
  onProcessOrder: () => void;
}

const OrderButton = ({ selectedCount, onProcessOrder }: OrderButtonProps) => {
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
        className="glass-card px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-500 text-white font-bold rounded-xl shadow-2xl glow-emerald transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-3">
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <TrendingUp className="w-5 h-5" />
          )}
          <div className="text-left">
            <p className="text-sm opacity-90">
              {isProcessing ? 'Processando...' : 'Processar Pedido'}
            </p>
            <p className="text-xs opacity-75">
              {selectedCount} tanque{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default OrderButton;
