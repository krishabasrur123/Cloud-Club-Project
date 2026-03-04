// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Parser from "./pages/Parser";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/parser" element={<Parser />} />
      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}