// client/src/App.jsx
<div style={{ padding: 20 }}>APP IS RENDERING ✅</div>
import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth.jsx";
import Signup from "./pages/Signup.jsx";
import Parser from "./pages/Parser.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/parser" element={<Parser />} />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/calendar" element={<Calendar />} />

      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}