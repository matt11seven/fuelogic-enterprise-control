import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings, ChevronDown, KeyRound } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/services/auth-api";

export function ProfileButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChangePassword = async () => {
    // Reset messages
    setError("");
    setSuccess("");
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Todos os campos são obrigatórios");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("A nova senha e a confirmação não coincidem");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Obter o token do localStorage
      const storedUser = localStorage.getItem('fuelogic_user');
      let token = "";
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        token = userData.token;
      }
      
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      
      await changePassword(currentPassword, newPassword, token);
      setSuccess("Senha alterada com sucesso!");
      
      // Limpar campos após sucesso
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Fechar o diálogo após 2 segundos
      setTimeout(() => {
        setPasswordDialogOpen(false);
        setSuccess("");
      }, 2000);
      
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Senha atual incorreta");
      } else {
        setError("Erro ao alterar senha. Tente novamente.");
      }
      console.error("Erro ao alterar senha:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
    <>
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
          <DropdownMenuItem onClick={() => {
            setPasswordDialogOpen(true);
            setIsOpen(false);
          }}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Trocar Senha</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Dialog para trocar senha */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Trocar Senha</DialogTitle>
            <DialogDescription>
              Altere sua senha de acesso ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
                {success}
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="current-password" className="text-right text-sm font-medium col-span-1">
                Senha atual
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-password" className="text-right text-sm font-medium col-span-1">
                Nova senha
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="confirm-password" className="text-right text-sm font-medium col-span-1">
                Confirmar
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
