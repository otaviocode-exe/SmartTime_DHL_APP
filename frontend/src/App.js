import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DeviceProvider } from "@/context/DeviceContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import DeviceSelector from "@/pages/DeviceSelector";
import GestorDashboard from "@/pages/GestorDashboard";
import NovaSolicitacao from "@/pages/NovaSolicitacao";
import MinhasSolicitacoes from "@/pages/MinhasSolicitacoes";
import GestorAnexos from "@/pages/GestorAnexos";
import GerenciaDashboard from "@/pages/GerenciaDashboard";
import Aprovacoes from "@/pages/Aprovacoes";
import GerenciaHistorico from "@/pages/GerenciaHistorico";
import Usuarios from "@/pages/Usuarios";
import Configuracoes from "@/pages/Configuracoes";
import AuditLog from "@/pages/AuditLog";
import { Toaster } from "@/components/ui/sonner";
import InstallPrompt from "@/components/InstallPrompt";

function HomeRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "gestor" ? "/gestor" : "/gerencia"} replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <DeviceProvider>
            <ThemeProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<HomeRedirect />} />

                <Route
                  path="/device-select"
                  element={
                    <ProtectedRoute>
                      <DeviceSelector />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/gestor"
                  element={
                    <ProtectedRoute roles={["gestor"]}>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<GestorDashboard />} />
                  <Route path="nova" element={<NovaSolicitacao />} />
                  <Route path="minhas" element={<MinhasSolicitacoes />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                </Route>

                <Route
                  path="/gerencia"
                  element={
                    <ProtectedRoute roles={["gerencia"]}>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<GerenciaDashboard />} />
                  <Route path="aprovacoes" element={<Aprovacoes />} />
                  <Route path="historico" element={<GerenciaHistorico />} />
                  <Route path="usuarios" element={<Usuarios />} />
                  <Route path="auditoria" element={<AuditLog />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster position="top-right" richColors />
              <InstallPrompt />
            </ThemeProvider>
          </DeviceProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
