import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Signup from "./pages/Signup.jsx";
import Parser from "./pages/Parser.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";

function ProtectedRoute({ children }) {
  const loggedIn = localStorage.getItem("token"); 
  return loggedIn ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />

      {/* public pages */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<Signup />} />

      {/* protected pages */}
      <Route
        path="/parser"
        element={
          <ProtectedRoute>
            <Parser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}