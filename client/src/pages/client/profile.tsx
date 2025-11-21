
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Lock, MapPin, Phone, Mail, Eye, EyeOff, Building2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ClientProfile() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    // Novos campos comerciais
    nomeFantasia: "",
    razaoSocial: "",
    inscricaoEstadual: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    cep: "",
    emailBoleto: "",
    emailNF: "",
    nomeContato: "",
    emailContato: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["/api/clients/profile", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/profile/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch client profile');
      const data = await response.json();
      return data;
    },
    enabled: !!currentUser.id,
  });

  // Load form data when query data changes
  useEffect(() => {
    if (clientData) {
      setProfileForm({
        name: clientData.name || "",
        email: clientData.email || "",
        phone: clientData.phone || "",
        whatsapp: clientData.whatsapp || "",
        address: clientData.address || "",
        // Novos campos comerciais
        nomeFantasia: clientData.nomeFantasia || "",
        razaoSocial: clientData.razaoSocial || "",
        inscricaoEstadual: clientData.inscricaoEstadual || "",
        logradouro: clientData.logradouro || "",
        numero: clientData.numero || "",
        complemento: clientData.complemento || "",
        bairro: clientData.bairro || "",
        cidade: clientData.cidade || "",
        cep: clientData.cep || "",
        emailBoleto: clientData.emailBoleto || "",
        emailNF: clientData.emailNF || "",
        nomeContato: clientData.nomeContato || "",
        emailContato: clientData.emailContato || "",
      });
    }
  }, [clientData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/clients/profile/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar perfil");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients/profile", currentUser.id] });
      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/clients/password/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar senha");
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast({
        title: "Sucesso!",
        description: "Senha atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "Nova senha e confirmação não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "Nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto client-panel">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e configurações de conta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information - Span 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Informações de Login (não editáveis) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-blue-700">Código de Acesso</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-bold text-blue-800">
                          {currentUser.username}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Este código não pode ser alterado</p>
                    </div>
                  </div>
                </div>

                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Informações Básicas
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Contato</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        disabled
                        className="bg-gray-50"
                        placeholder="Não pode ser alterado"
                      />
                      <p className="text-xs text-gray-500 mt-1">Este campo não pode ser editado</p>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Principal</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="seu.email@exemplo.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                      <Input
                        id="nomeFantasia"
                        value={profileForm.nomeFantasia}
                        onChange={(e) => setProfileForm({ ...profileForm, nomeFantasia: e.target.value })}
                        placeholder="Empresa Ltda"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="razaoSocial">Razão Social</Label>
                      <Input
                        id="razaoSocial"
                        value={profileForm.razaoSocial}
                        onChange={(e) => setProfileForm({ ...profileForm, razaoSocial: e.target.value })}
                        placeholder="Empresa Comercial Ltda"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                      <Input
                        id="cpfCnpj"
                        value={clientData?.cpfCnpj || "Não informado"}
                        disabled
                        className="bg-gray-50"
                        placeholder="Não pode ser alterado"
                      />
                      <p className="text-xs text-gray-500 mt-1">Este campo não pode ser editado</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                      <Input
                        id="inscricaoEstadual"
                        value={profileForm.inscricaoEstadual}
                        onChange={(e) => setProfileForm({ ...profileForm, inscricaoEstadual: e.target.value })}
                        placeholder="123.456.789.012"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço Completo */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Endereço Completo
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="logradouro">Logradouro/Rua</Label>
                      <Input
                        id="logradouro"
                        value={profileForm.logradouro}
                        onChange={(e) => setProfileForm({ ...profileForm, logradouro: e.target.value })}
                        placeholder="Rua das Flores"
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={profileForm.numero}
                        onChange={(e) => setProfileForm({ ...profileForm, numero: e.target.value })}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={profileForm.complemento}
                        onChange={(e) => setProfileForm({ ...profileForm, complemento: e.target.value })}
                        placeholder="Apto 45, Bloco B"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={profileForm.bairro}
                        onChange={(e) => setProfileForm({ ...profileForm, bairro: e.target.value })}
                        placeholder="Centro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={profileForm.cidade}
                        onChange={(e) => setProfileForm({ ...profileForm, cidade: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={profileForm.cep}
                        onChange={(e) => setProfileForm({ ...profileForm, cep: e.target.value })}
                        placeholder="01234-567"
                      />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Contato
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="whatsapp"
                          value={profileForm.whatsapp}
                          onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nomeContato">Nome do Contato</Label>
                      <Input
                        id="nomeContato"
                        value={profileForm.nomeContato}
                        onChange={(e) => setProfileForm({ ...profileForm, nomeContato: e.target.value })}
                        placeholder="Nome da pessoa de contato"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailContato">E-mail do Contato</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="emailContato"
                          type="email"
                          value={profileForm.emailContato}
                          onChange={(e) => setProfileForm({ ...profileForm, emailContato: e.target.value })}
                          placeholder="contato@empresa.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* E-mails Comerciais */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    E-mails Comerciais
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emailBoleto">E-mail para Boleto</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="emailBoleto"
                          type="email"
                          value={profileForm.emailBoleto}
                          onChange={(e) => setProfileForm({ ...profileForm, emailBoleto: e.target.value })}
                          placeholder="financeiro@empresa.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="emailNF">E-mail para Nota Fiscal</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="emailNF"
                          type="email"
                          value={profileForm.emailNF}
                          onChange={(e) => setProfileForm({ ...profileForm, emailNF: e.target.value })}
                          placeholder="nf@empresa.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço Legado (opcional) */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Observações Adicionais</h3>
                  <div>
                    <Label htmlFor="address">Observações de Endereço</Label>
                    <Textarea
                      id="address"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="Informações adicionais sobre entrega, localização, etc."
                      rows={3}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-bg text-white"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Change Password - Right column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Digite sua senha atual"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Digite sua nova senha"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirme sua nova senha"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-bg text-white"
                  disabled={updatePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                  {updatePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Additional Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Data de Cadastro</Label>
                  <p className="text-sm text-gray-900">
                    {clientData?.createdAt ? new Date(clientData.createdAt).toLocaleDateString('pt-BR') : 'Não informado'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Última Atualização</Label>
                  <p className="text-sm text-gray-900">
                    {clientData?.updatedAt ? new Date(clientData.updatedAt).toLocaleDateString('pt-BR') : 'Não informado'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status da Conta</Label>
                  <span className={`text-sm font-medium ${clientData?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {clientData?.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Vendedor Responsável</Label>
                  <p className="text-sm text-gray-900">
                    {clientData?.vendorName || 'Não atribuído'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
