import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import TrackerPage from './pages/TrackerPage.jsx'
import MedicinesPage from './pages/MedicinesPage.jsx'
import ChatbotPage from './pages/ChatbotPage.jsx'
import RootLayout from './pages/RootLayout.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <AuthPage /> },
      { 
        path: 'dashboard', 
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute> 
      },
      { 
        path: 'tracker', 
        element: <ProtectedRoute><TrackerPage /></ProtectedRoute> 
      },
      { 
        path: 'medicines', 
        element: <ProtectedRoute><MedicinesPage /></ProtectedRoute> 
      },
      { 
        path: 'chatbot', 
        element: <ProtectedRoute><ChatbotPage /></ProtectedRoute> 
      },
      { 
        path: 'profile', 
        element: <ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute> 
      }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
