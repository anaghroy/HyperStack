import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import IDE from "./components/layout/IDE";
import Login from "./pages/Login";
import ConnectRepo from "./pages/ConnectRepo";
import Settings from "./pages/Settings";
import AccountSettings from "./pages/AccountSettings";
import { Toaster } from "react-hot-toast";
import SocketListener from "./components/SocketListener";
import "./styles/main.scss";

const App = () => {
  return (
    <>
      <SocketListener />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#fff',
            borderLeft: '4px solid #fff',
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '1px',
            padding: '12px 20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              borderLeft: '4px solid #ef4444',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          }
        }}
      />
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
              path="/connect-repo" 
              element={
                <ProtectedRoute>
                  <ConnectRepo />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <AccountSettings />
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
    </>
  );
};

export default App;