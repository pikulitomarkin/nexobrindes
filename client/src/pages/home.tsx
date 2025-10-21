
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, User, Factory, DollarSign, Briefcase } from "lucide-react";

export default function Home() {
  const [selectedPanel, setSelectedPanel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const panels = [
    { 
      id: "admin", 
      label: "Administrador", 
      icon: Shield, 
      color: "bg-red-500 hover:bg-red-600",
      description: "Painel completo de administração"
    },
    { 
      id: "vendor", 
      label: "Vendedor", 
      icon: Users, 
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Gestão de vendas e clientes"
    },
    { 
      id: "client", 
      label: "Cliente", 
      icon: User, 
      color: "bg-green-500 hover:bg-green-600",
      description: "Acompanhe seus pedidos"
    },
    { 
      id: "producer", 
      label: "Produtor", 
      icon: Factory, 
      color: "bg-purple-500 hover:bg-purple-600",
      description: "Gestão de produção"
    },
    { 
      id: "finance", 
      label: "Financeiro", 
      icon: DollarSign, 
      color: "bg-yellow-500 hover:bg-yellow-600",
      description: "Controle financeiro"
    },
    { 
      id: "partner", 
      label: "Sócio", 
      icon: Briefcase, 
      color: "bg-indigo-500 hover:bg-indigo-600",
      description: "Visão executiva"
    }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPanel) {
      toast({
        title: "Erro",
        description: "Selecione um painel para acessar",
        variant: "destructive",
      });
      return;
    }

    if (!username || !password) {
      toast({
        title: "Erro", 
        description: "Preencha usuário e senha",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username, 
          password, 
          preferredRole: selectedPanel 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${data.user.name}!`,
        });

        // Redirecionar baseado no role
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
            default:
              window.location.href = "/dashboard";
          }
        }, 100);
      } else {
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

  const quickLogin = (demoUsername: string, demoPassword: string, role: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setSelectedPanel(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-teal-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            Nexo Brindes
          </h1>
          <p className="text-xl text-blue-100">
            Sistema Integrado de Gestão de Vendas e Produção
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Seleção de Painéis */}
          <div className="lg:col-span-2">
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Selecione seu Painel de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {panels.map((panel) => {
                    const Icon = panel.icon;
                    const isSelected = selectedPanel === panel.id;
                    
                    return (
                      <button
                        key={panel.id}
                        onClick={() => setSelectedPanel(panel.id)}
                        className={`
                          p-6 rounded-lg border-2 transition-all duration-200 text-left
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${panel.color} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{panel.label}</h3>
                            <p className="text-sm text-gray-600">{panel.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário de Login */}
          <div className="lg:col-span-1">
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl text-center">
                  {selectedPanel ? `Login - ${panels.find(p => p.id === selectedPanel)?.label}` : 'Faça seu Login'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedPanel ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Shield className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-600">
                      Selecione um painel ao lado para fazer login
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Usuário</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Digite seu usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                      disabled={isLoading}
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                )}

                {/* Usuários de Teste */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Usuários de teste</span>
                    </div>
                  </div>

                  <div className="grid gap-2 mt-4">
                    <button
                      onClick={() => quickLogin("admin", "123456", "admin")}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors text-left text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <span>Administrador</span>
                      </div>
                      <span className="text-xs text-gray-400">admin</span>
                    </button>

                    <button
                      onClick={() => quickLogin("vendedor1", "123456", "vendor")}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors text-left text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>Vendedor</span>
                      </div>
                      <span className="text-xs text-gray-400">vendedor1</span>
                    </button>

                    <button
                      onClick={() => quickLogin("cliente1", "123456", "client")}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors text-left text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-green-600" />
                        <span>Cliente</span>
                      </div>
                      <span className="text-xs text-gray-400">cliente1</span>
                    </button>

                    <button
                      onClick={() => quickLogin("produtor1", "123456", "producer")}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors text-left text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Factory className="h-4 w-4 text-purple-600" />
                        <span>Produtor</span>
                      </div>
                      <span className="text-xs text-gray-400">produtor1</span>
                    </button>

                    <button
                      onClick={() => quickLogin("admin", "123456", "partner")}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors text-left text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-indigo-600" />
                        <span>Sócio</span>
                      </div>
                      <span className="text-xs text-gray-400">admin</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                  <p>Clique em qualquer usuário para preencher automaticamente</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-blue-100">
            © 2024 Nexo Brindes - Sistema Integrado de Gestão
          </p>
        </div>
      </div>
    </div>
  );
}
