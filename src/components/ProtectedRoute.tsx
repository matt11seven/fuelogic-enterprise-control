import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * Componente para proteger rotas que requerem autenticação
 * Redireciona para a página de login se o usuário não estiver autenticado
 * Opcionalmente verifica se o usuário tem uma role específica
 */
export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  
  // Se estiver carregando a autenticação, mostrar um indicador de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Se não estiver autenticado, redirecionar para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Se uma role específica for requerida, verificar se o usuário tem essa role
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-center mb-4">
          Você não tem permissão para acessar esta página.
          É necessário ter o papel de <strong>{requiredRole}</strong>.
        </p>
        <p className="text-center text-sm text-gray-500">
          Seu papel atual é: <span className="font-medium">{user.role}</span>
        </p>
      </div>
    );
  }
  
  // Usuário autenticado e com a role adequada, renderizar o conteúdo protegido
  return <>{children}</>;
};
