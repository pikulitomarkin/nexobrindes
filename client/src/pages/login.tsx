import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn, User, Shield, Users, Factory, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
              window.location.href = "/dashboard";
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

  const demoUsers = [
    { username: "admin", password: "123456", role: "admin", label: "Administrador", icon: Shield, color: "text-red-600" },
    { username: "vendedor1", password: "123456", role: "vendor", label: "Vendedor", icon: Users, color: "text-blue-600" },
    { username: "cliente1", password: "123456", role: "client", label: "Cliente", icon: User, color: "text-green-600" },
    { username: "produtor1", password: "123456", role: "producer", label: "Produtor", icon: Factory, color: "text-purple-600" },
    { username: "logistica1", password: "123456", role: "logistics", label: "Logística", icon: Factory, color: "text-indigo-600" },
    { username: "admin", password: "123456", role: "partner", label: "Sócio", icon: DollarSign, color: "text-yellow-600" },
  ];

  const quickLogin = (user: any) => {
    setUsername(user.username);
    setPassword(user.password);
    setSelectedProfile(user.role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-teal-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Nexo Brindes</CardTitle>
            <p className="text-gray-600">Acesse seu painel personalizado</p>
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
                    <SelectItem value="logistics">
                      <div className="flex items-center">
                        <Factory className="h-4 w-4 mr-2" />
                        Logística
                      </div>
                    </SelectItem>
                    <SelectItem value="partner">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Sócio
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Usuários de teste</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoUsers.map((user, index) => {
                const Icon = user.icon;
                return (
                  <button
                    key={`${user.username}-${user.role}-${index}`}
                    data-testid={`button-demo-${user.username}-${user.role}`}
                    onClick={() => quickLogin(user)}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${user.color}`} />
                      <div>
                        <p className="font-medium text-sm">{user.label}</p>
                        <p className="text-xs text-gray-500">{user.username}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">Clique para preencher</span>
                  </button>
                );
              })}</div>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>Clique em qualquer usuário para preencher automaticamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}