
import { Database } from "lucide-react";
import { useEffect, useState } from "react";

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="glass-card p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl glow-emerald">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent text-shadow">
              FuelLogic Enterprise
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Advanced Fuel Management & Procurement System
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-emerald-400 text-sm font-semibold">SISTEMA ATIVO</span>
          </div>
          <p className="text-slate-300 text-sm font-mono">
            {currentTime.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
