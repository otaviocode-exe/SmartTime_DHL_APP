import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-[#D40511]" size={32} />
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
