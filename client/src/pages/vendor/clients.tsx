import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ShoppingCart } from "lucide-react";

export default function VendorClients() {
  const vendorId = "vendor-1";
  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/vendor/clients", vendorId],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Clientes</h1>
        <p className="text-gray-600">Clientes que compraram através do seu link</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients?.map((client: any) => (
          <Card key={client.id} className="card-hover">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {client.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {client.phone || 'Não informado'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold gradient-text">{client.ordersCount || 0}</p>
                    <p className="text-xs text-gray-500">Pedidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold gradient-text">
                      R$ {((client.totalSpent || 0) / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>

              <Button className="w-full gradient-bg text-white">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver Pedidos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Ainda não há clientes cadastrados através do seu link</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}