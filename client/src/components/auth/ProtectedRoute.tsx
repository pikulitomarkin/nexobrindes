import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRole, requiredRoles }: ProtectedRouteProps) {
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
        console.log("Checking auth with token:", token.substring(0, 20) + "...");
        
        const response = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Auth response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Auth verification failed:", response.status, errorData);
          throw new Error("Token invalid");
        }

        const data = await response.json();
        console.log("Auth verification successful:", data.user.username, data.user.role);
        
        // Update stored user data
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Check if user role matches required role(s) (but allow admin access to everything)
        const hasAccess = data.user.role === "admin" || 
          (!requiredRole && !requiredRoles) ||
          (requiredRole && data.user.role === requiredRole) ||
          (requiredRoles && requiredRoles.includes(data.user.role));
        
        if ((requiredRole || requiredRoles) && !hasAccess) {
          // Redirect to appropriate main dashboard
          switch (data.user.role) {
            case "vendor":
              setLocation("/vendor/orders");
              break;
            case "client":
              setLocation("/client/orders");
              break;
            case "producer":
              setLocation("/producer/orders");
              break;
            case "partner":
              setLocation("/");
              break;
            case "finance":
              setLocation("/finance/receivables");
              break;
            default:
              setLocation("/login");
          }
          return;
        }

        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLocation("/login");
        return;
      }
    };

    checkAuth();
  }, [requiredRole, requiredRoles, setLocation]);

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