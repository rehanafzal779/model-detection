
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import App from "./App.tsx";
import { LoginScreen } from './pages/LoginScreen.tsx';
import { ResetPasswordScreen } from './pages/ResetPasswordScreen.tsx';
import "./index.css";

// ✅ Wrapper component to provide navigate to LoginScreen
function LoginWrapper() {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    console.log('✅ Login successful, navigating to dashboard...');
    // Navigate to dashboard after successful login
    navigate('/');
  };
  
  return <LoginScreen onLogin={handleLogin} />;
}

createRoot(document.getElementById("root")!).render(
  <Router>
    <Routes>
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </Router>
);
  