import { useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Fuelogic Enterprise Control</p>
          <p className="mt-2">Versão 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
