import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, Users, Factory, DollarSign, Tv } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/ui/logo";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, preferredRole: selectedProfile }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        console.log("Login successful for user:", data.user.username, "Role:", data.user.role);

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${data.user.name}!`,
        });

        // Wait a moment for localStorage to be set, then redirect
        setTimeout(() => {
          const { role } = data.user;
          switch (role) {
            case "admin":
              window.location.href = "/";
              break;
            case "vendor":
              window.location.href = "/vendor/dashboard";
              break;
            case "client":
              window.location.href = "/client/orders";
              break;
            case "producer":
              window.location.href = "/producer/production-dashboard";
              break;
            case "logistics":
              window.location.href = "/logistics/dashboard";
              break;
            case "finance":
              window.location.href = "/finance/payments";
              break;
            case "partner":
              window.location.href = "/partner/clients";
              break;
            case "dashtv":
              window.location.href = "/dashtv";
              break;
            default:
              window.location.href = "/dashboard";
          }
        }, 100);
      } else {
        console.error("Login failed:", data);
        toast({
          title: "Erro no login",
          description: data.error || "Credenciais inválidas",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-teal-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <Logo size="lg" variant="full" />
            </div>
            <p className="text-gray-600 text-sm">Acesse seu painel personalizado</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile">Perfil de Acesso</Label>
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value="vendor">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Vendedor
                      </div>
                    </SelectItem>
                    <SelectItem value="client">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Cliente
                      </div>
                    </SelectItem>
                    <SelectItem value="producer">
                      <div className="flex items-center">
                        <Factory className="h-4 w-4 mr-2" />
                        Produtor
                      </div>
                    </SelectItem>
                    <SelectItem value="logistics">
                      <div className="flex items-center">
                        <Factory className="h-4 w-4 mr-2" />
                        Logística
                      </div>
                    </SelectItem>
                    <SelectItem value="partner">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Sócio
                      </div>
                    </SelectItem>
                    <SelectItem value="finance">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Financeiro
                      </div>
                    </SelectItem>
                    <SelectItem value="dashtv">
                      <div className="flex items-center">
                        <Tv className="h-4 w-4 mr-2" />
                        TV Dashboard
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="Digite seu usuário ou código"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Clientes: use o código fornecido no cadastro (ex: CLI123456ABCD)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                data-testid="button-login"
                className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}