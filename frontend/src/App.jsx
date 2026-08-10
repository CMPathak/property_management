import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "./theme";

import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Floors from "./pages/Floors";
import Rooms from "./pages/Rooms";
import Beds from "./pages/Beds";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import Rent from "./pages/Rent";
import Payments from "./pages/Payments";
import Invoices from "./pages/Invoices";
import Agreements from "./pages/Agreements";
import Complaints from "./pages/Complaints";
import Staff from "./pages/Staff";
import Tasks from "./pages/Tasks";
import Attendance from "./pages/Attendance";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Route Guard for Private / Protected Routes
function PrivateRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const token = useSelector((state) => state.auth.token);
  return (isAuthenticated || Boolean(token)) ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [themeMode, setThemeMode] = useState("light");

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const currentTheme = themeMode === "light" ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Main Application Layout Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout toggleTheme={toggleTheme} mode={themeMode} />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="floors" element={<Floors />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="beds" element={<Beds />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="rent" element={<Rent />} />
            <Route path="payments" element={<Payments />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="agreements" element={<Agreements />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="staff" element={<Staff />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </ThemeProvider>
  );
}
