import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function ProfileButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/login");
  };
  
  if (!user) {
    return (
      <Button variant="ghost" onClick={() => navigate("/login")} className="p-2">
        <User className="h-5 w-5 mr-1" />
        <span>Entrar</span>
      </Button>
    );
  }
  
  // Obter as iniciais do nome de usuário para o avatar
  const getInitials = () => {
    return user.username.substring(0, 2).toUpperCase();
  };
  
  // Determinar o texto da role para exibição
  const getRoleText = () => {
    switch (user.role) {
      case "admin":
        return "Administrador";
      case "manager":
        return "Gerente";
      case "operator":
        return "Operador";
      default:
        return user.role;
    }
  };
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative rounded-full p-0 h-8 w-8 mr-2">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <p className="font-medium text-sm">{user.username}</p>
          <p className="text-xs text-muted-foreground">{getRoleText()}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/perfil")}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
