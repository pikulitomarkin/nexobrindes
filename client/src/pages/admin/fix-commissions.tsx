
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FixCommissions() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const recalculateCommissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/recalculate-commissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Erro ao recalcular comissões");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Sucesso!",
        description: "Comissões recalculadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao recalcular comissões",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRecalculating(false);
    }
  });

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setResult(null);
    recalculateCommissionsMutation.mutate();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Correção de Comissões Pós-Migração</h1>
        <p className="text-gray-600">Ferramenta para recalcular comissões de pedidos existentes após a migração</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Importante:</strong> Esta ferramenta foi criada para corrigir comissões que podem ter sido perdidas durante a migração para PostgreSQL. 
            Use apenas se as comissões dos vendedores e sócios estiverem zeradas ou incorretas.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recalcular Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Esta operação irá:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
                <li>Verificar todos os pedidos existentes no sistema</li>
                <li>Identificar pedidos sem comissões calculadas</li>
                <li>Recalcular comissões de vendedores (baseado na taxa individual)</li>
                <li>Recalcular comissões de sócios (15% dividido igualmente entre todos os sócios)</li>
                <li>Manter comissões existentes intactas</li>
              </ul>
              
              <div className="pt-4">
                <Button 
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="w-full"
                >
                  {isRecalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Recalculando Comissões...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Iniciar Recálculo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Recálculo Concluído</h3>
              </div>
              <p className="text-green-700 text-sm">{result.message}</p>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertDescription>
            <strong>Após o recálculo:</strong> Verifique os painéis dos vendedores e sócios para confirmar que as comissões 
            estão sendo exibidas corretamente. As comissões dos vendedores ficarão pendentes até que os pedidos sejam entregues.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
