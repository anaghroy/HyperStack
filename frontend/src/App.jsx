import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import IDE from "./components/layout/IDE";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import { Toaster } from "react-hot-toast";
import SocketListener from "./components/SocketListener";
import "./styles/main.scss";

const App = () => {
  return (
    <>
      <SocketListener />
      <Toaster position="top-right" />
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
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
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