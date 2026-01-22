import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RoleBasedRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    
    if (!userStr) {
      setLocation("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // Redirect each role to their appropriate dashboard
      switch (user.role) {
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
        case "finance":
          setLocation("/finance");
          break;
        case "logistics":
          setLocation("/logistics/dashboard");
          break;
        case "dashtv":
          setLocation("/dashtv");
          break;
        default:
          setLocation("/login");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setLocation("/login");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
