import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BackendStatusProvider } from './context/BackendStatusContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import DocumentDetails from './pages/DocumentDetails';
import Chat from './pages/Chat';
import Analysis from './pages/Analysis';
import Comparison from './pages/Comparison';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <BackendStatusProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="library" element={<Library />} />
                <Route path="documents/:documentId" element={<DocumentDetails />} />
                <Route path="chat" element={<Chat />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="comparison" element={<Comparison />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </BackendStatusProvider>
    </ThemeProvider>
  );
}

