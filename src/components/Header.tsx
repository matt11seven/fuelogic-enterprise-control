import { Database, Sun, Moon } from "lucide-react";
import { ProfileButton } from "./ProfileButton";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinkClass = (isActive: boolean) =>
    `px-3 py-1.5 rounded-md text-sm border transition-colors ${
      isActive
        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
        : "bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-700/60"
    }`;

  return (
    <header className="glass-card p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl glow-emerald">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent text-shadow">
              GasMobile Enterprise
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Gerenciamento avancado de tanques
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Link to="/" className={navLinkClass(location.pathname === "/")}>
              Operacao
            </Link>
            <Link to="/cotacoes" className={navLinkClass(location.pathname === "/cotacoes")}>
              Cotacoes
            </Link>
            <Link to="/pedidos" className={navLinkClass(location.pathname === "/pedidos")}>
              Pedidos
            </Link>
            <Link to="/sophia-ops" className={navLinkClass(location.pathname === "/sophia-ops")}>
              Soph<span className="uppercase">IA</span>
            </Link>
          </div>
          <ProfileButton />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/60 transition-colors duration-200 border border-slate-700"
            aria-label="Alternar tema"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-300" />
            )}
          </button>

          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-semibold">SISTEMA ATIVO</span>
            </div>
            <p className="text-slate-300 text-sm font-mono">{currentTime.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
