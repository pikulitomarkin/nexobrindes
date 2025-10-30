
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Archive,
  Trash2,
  FileSpreadsheet,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

export default function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const { toast } = useToast();

  // Buscar logs do sistema
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/logs", { search: searchTerm, action: actionFilter, user: userFilter, level: levelFilter, date: dateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        action: actionFilter,
        user: userFilter,
        level: levelFilter,
        date: dateFilter
      });
      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error("Erro ao buscar logs");
      return response.json();
    },
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Buscar usuários para filtro
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Erro ao buscar usuários");
      return response.json();
    },
  });

  // Buscar backups de logs
  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["/api/admin/logs/backups"],
    queryFn: async () => {
      const response = await fetch("/api/admin/logs/backups");
      if (!response.ok) throw new Error("Erro ao buscar backups");
      return response.json();
    },
  });

  // Criar backup manual
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/logs/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Erro ao criar backup");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs/backups"] });
      refetch(); // Refresh logs
      toast({
        title: "Backup criado",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar backup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Exportar logs
  const exportLogsMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        action: actionFilter,
        user: userFilter,
        level: levelFilter,
        date: dateFilter,
        export: "true"
      });
      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error("Erro ao exportar logs");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-sistema-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Logs exportados",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Baixar backup como Excel
  const downloadBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/admin/logs/backups/${backupId}/download`);
      if (!response.ok) throw new Error("Erro ao baixar backup");
      const data = await response.json();
      
      // Create Excel file
      const ws = XLSX.utils.json_to_sheet(data.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Logs");
      
      // Set column widths
      const colWidths = [
        { wch: 20 }, // Data
        { wch: 20 }, // Usuário
        { wch: 15 }, // Ação
        { wch: 10 }, // Nível
        { wch: 50 }, // Descrição
        { wch: 30 }, // Detalhes
        { wch: 15 }, // IP
        { wch: 30 }  // User Agent
      ];
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, data.fileName);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Backup baixado",
        description: `Arquivo ${data.fileName} baixado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao baixar backup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Excluir backup
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/admin/logs/backups/${backupId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir backup");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs/backups"] });
      toast({
        title: "Backup excluído",
        description: "O backup foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir backup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para formatar a data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Função para obter ícone e cor do nível de log
  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return { icon: XCircle, color: 'text-red-600 bg-red-50' };
      case 'warning':
        return { icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-600 bg-green-50' };
      default:
        return { icon: Info, color: 'text-blue-600 bg-blue-50' };
    }
  };

  // Função para obter cor da ação
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para traduzir ações
  const translateAction = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'CRIAR';
      case 'UPDATE':
        return 'ATUALIZAR';
      case 'DELETE':
        return 'EXCLUIR';
      case 'LOGIN':
        return 'LOGIN';
      case 'LOGOUT':
        return 'LOGOUT';
      default:
        return action;
    }
  };

  // Função para traduzir níveis
  const translateLevel = (level: string) => {
    switch (level) {
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Aviso';
      case 'success':
        return 'Sucesso';
      case 'info':
        return 'Info';
      default:
        return level;
    }
  };

  // Filtrar logs
  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs do Sistema</h1>
          <p className="text-gray-600">Auditoria completa e backups automáticos dos logs do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => createBackupMutation.mutate()} disabled={createBackupMutation.isPending}>
            <Archive className="h-4 w-4 mr-2" />
            Criar Backup
          </Button>
          <Button onClick={() => exportLogsMutation.mutate()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs Atuais
          </TabsTrigger>
          <TabsTrigger value="backups">
            <Database className="h-4 w-4 mr-2" />
            Backups ({backups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Logs</p>
                <p className="text-3xl font-bold gradient-text">{logs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-3xl font-bold gradient-text">
                  {logs.filter((log: any) => {
                    const today = new Date().toDateString();
                    return new Date(log.createdAt).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Erros</p>
                <p className="text-3xl font-bold gradient-text">
                  {logs.filter((log: any) => log.level === 'error').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                <p className="text-3xl font-bold gradient-text">
                  {new Set(logs.map((log: any) => log.userId)).size}
                </p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Buscar logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label>Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Usuário</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nível</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs do Sistema ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum log encontrado com os filtros aplicados.
                </div>
              ) : (
                filteredLogs.map((log: any) => {
                  const { icon: LevelIcon, color: levelColor } = getLogLevelIcon(log.level);
                  
                  return (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${levelColor}`}>
                          <LevelIcon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getActionColor(log.action)}>
                              {translateAction(log.action)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              por <strong>{log.userName}</strong>
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-gray-900 mb-1">{log.description}</p>
                          
                          {log.details && (
                            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                              <strong>Detalhes:</strong> {log.details}
                            </div>
                          )}
                          
                          {log.ipAddress && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>IP: {log.ipAddress}</span>
                              {log.userAgent && (
                                <span>User Agent: {log.userAgent.substring(0, 50)}...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          {/* Informações sobre Backups */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Automático de Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Sistema de Backup Automático</p>
                    <p>• Os logs são automaticamente arquivados a cada 7 dias</p>
                    <p>• Logs antigos são removidos do sistema após o backup</p>
                    <p>• Todos os backups ficam disponíveis para download em formato Excel</p>
                    <p>• Use "Criar Backup" para gerar um backup manual dos logs atuais</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Backups */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivos de Backup ({backups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {backupsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Archive className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">Nenhum backup encontrado</p>
                  <p className="text-sm">Os backups serão criados automaticamente a cada 7 dias</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup: any) => (
                    <div key={backup.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-50">
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              Backup - {new Date(backup.backupDate).toLocaleDateString('pt-BR')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {backup.logCount.toLocaleString()} logs • 
                              Criado em {new Date(backup.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                            {backup.status === 'completed' ? 'Completo' : backup.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBackupMutation.mutate(backup.id)}
                            disabled={downloadBackupMutation.isPending}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Excel
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Backup</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackupMutation.mutate(backup.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
