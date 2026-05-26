import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import IDE from "./components/layout/IDE";
import Login from "./pages/Login";
import "./styles/main.scss";

const App = () => {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ide" 
              element={
                <ProtectedRoute>
                  <IDE />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
};

export default App;