import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import AdminAttendance from "./AdminAttendance";
import StaffAttendance from "./StaffAttendance";
import { Box, CircularProgress } from "@mui/material";

export default function Attendance() {
  const user = useSelector((state) => state.auth.user);
  const [localUser, setLocalUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setLocalUser(res.data);
      } catch (err) {
        console.error("Failed to load fresh user:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFreshUser();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeUser = localUser || user;
  const isFullAccess = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "OWNER" || activeUser?.role === "MANAGER" || (activeUser?.role === "STAFF" && activeUser?.designation === "Property Manager");

  if (isFullAccess) {
    return <AdminAttendance />;
  }

  return <StaffAttendance />;
}
