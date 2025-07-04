import { TrendingUp } from "lucide-react";
import { useState } from "react";
import OrderProcessModal from "./OrderProcessModal";
import { Station } from "@/hooks/use-tank-data";

interface OrderButtonProps {
  selectedCount: number;
  totalLiters?: number;
  onProcessOrder: () => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
  stations: Station[] | undefined;
}

const OrderButton = ({ 
  selectedCount, 
  totalLiters = 0, 
  onProcessOrder,
  selectedTanks,
  stations
}: OrderButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (selectedCount === 0) return;
    setIsModalOpen(true);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-full shadow-lg flex items-center space-x-2 transition-all duration-200 ease-in-out transform hover:scale-105"
        >
          <TrendingUp className="h-5 w-5" />
          <span>Processar Pedido ({selectedCount} tanques{totalLiters > 0 ? ` - ${Math.floor(totalLiters).toLocaleString()}L` : ''})</span>
        </button>
      </div>
      
      <OrderProcessModal 
        open={isModalOpen}
        setOpen={setIsModalOpen}
        selectedTanks={selectedTanks}
        stations={stations}
        onProcessOrder={onProcessOrder}
      />
    </>
  );
};

export default OrderButton;
