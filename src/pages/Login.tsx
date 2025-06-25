
import { useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirecionar para a página principal se o usuário já estiver logado
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100/50 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-900 flex flex-col relative">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
        <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Fuelogic Enterprise Control</p>
          <p className="mt-2 text-slate-500 dark:text-slate-500">Versão 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
