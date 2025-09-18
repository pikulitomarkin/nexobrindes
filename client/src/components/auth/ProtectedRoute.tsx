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
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Auth verification failed:", errorData);
          throw new Error("Token invalid");
        }

        const data = await response.json();
        
        // Update stored user data
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Check if user role matches required role (but allow admin access to everything)
        if (requiredRole && data.user.role !== requiredRole && data.user.role !== "admin") {
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