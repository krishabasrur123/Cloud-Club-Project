import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Signup from "./pages/Signup.jsx";
import Parser from "./pages/Parser.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";

function ProtectedRoute({ children }) {
  const loggedIn = !!localStorage.getItem("token");
  return loggedIn ? children : <Navigate to="/auth" replace />;
}

// Redirect already-logged-in users away from auth pages
function PublicRoute({ children }) {
  const loggedIn = !!localStorage.getItem("token");
  return loggedIn ? <Navigate to="/dashboard" replace /> : children;
}

function RootRedirect() {
  const loggedIn = !!localStorage.getItem("token");
  return <Navigate to={loggedIn ? "/dashboard" : "/auth"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* public pages — redirect away if already logged in */}
      <Route path="/auth"   element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

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