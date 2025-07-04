import { TrendingUp, ArrowRight, Truck, Fuel } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);
  
  // Create pulsing effect when new tanks are selected
  useEffect(() => {
    if (selectedCount > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedCount]);

  const handleClick = () => {
    if (selectedCount === 0) return;
    setIsPulsing(false);
    setIsModalOpen(true);
  };

  if (selectedCount === 0) return null;
  
  // Format liters with thousands separator
  const formattedLiters = Math.floor(totalLiters).toLocaleString();
  
  // Calculate dynamic background based on selected quantity
  // More selections = deeper gradient
  const intensityFactor = Math.min(selectedCount / 10, 1); // Cap at 10 tanks for max intensity
  const gradientIntensity = 100 - Math.floor(intensityFactor * 30); // Reduce lightness for more tanks

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        {/* Subtle pulse animation */}
        <div className={`
          ${isPulsing ? 'animate-ping-slow' : ''}
          absolute inset-0 bg-emerald-500/20 
          rounded-full opacity-30 -z-10 scale-105
        `}></div>
        
        <button
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Processar pedido de combustível"
          className={`
            group
            bg-emerald-600 hover:bg-emerald-700
            text-white font-medium
            px-4 py-3
            rounded-full 
            shadow-md hover:shadow-lg
            flex items-center gap-2
            transition-all duration-200 ease-out
            border border-emerald-500/30
          `}>
          {/* Simple icon */}
          <div className="flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
          
          <div className="flex items-center text-sm">
            <span>{selectedCount}</span>
            {totalLiters > 0 && (
              <span className="ml-1">
                | {formattedLiters}L
              </span>
            )}
          </div>
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
