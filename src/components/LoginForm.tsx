
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o usuário e senha.",
        variant: "destructive",
      });
      return;
    }
    
    const success = await login(username, password);
    
    if (success) {
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo ao Gasmobile Tank System.",
      });
      navigate("/");
    }
  };
  
  return (
    <Card className="w-full max-w-[400px] glass-card animate-fade-in">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl glow-emerald shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
          GasMobile Enterprise
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Sistema de Controle de Tanques
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium">
              Usuário
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Digite seu nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
              className="glass-card-input h-11 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="glass-card-input h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 transition-all duration-200 hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
