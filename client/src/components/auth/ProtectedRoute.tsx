import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token || !storedUser) {
        setLocation("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Token invalid");
        }

        const data = await response.json();
        
        // Check if user role matches required role
        if (requiredRole && data.user.role !== requiredRole) {
          // Redirect to appropriate dashboard
          switch (data.user.role) {
            case "admin":
              setLocation("/admin/dashboard");
              break;
            case "vendor":
              setLocation("/vendor/dashboard");
              break;
            case "client":
              setLocation("/client/dashboard");
              break;
            case "producer":
              setLocation("/producer/dashboard");
              break;
            case "partner":
              setLocation("/partner/dashboard");
              break;
            default:
              setLocation("/login");
          }
          return;
        }

        setUser(data.user);
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLocation("/login");
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [requiredRole, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}