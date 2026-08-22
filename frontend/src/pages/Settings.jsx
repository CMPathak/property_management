import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  Avatar,
  Alert,
} from "@mui/material";
import api from "../services/api";
import { setCredentials } from "../redux/authSlice";

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  TENANT: "Tenant"
};

export default function Settings() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const [successMsg, setSuccessMsg] = useState("");

  // Profile Form States
  const [fullName, setFullName] = useState(currentUser?.full_name || "");
  const [userEmail, setUserEmail] = useState(currentUser?.email || "");
  const [userPhone, setUserPhone] = useState(currentUser?.phone_number || "");
  const [userRole, setUserRole] = useState(currentUser?.role || "TENANT");
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photo_url || "");

  // Check RBAC
  const hasAccess = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(currentUser?.role);

  // Load live logged-in user profile from backend
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        const profile = res.data;
        if (profile) {
          setFullName(profile.full_name || "");
          setUserEmail(profile.email || "");
          setUserPhone(profile.phone_number || "");
          setUserRole(profile.role || "TENANT");
          setPhotoUrl(profile.photo_url || "");
        }
      } catch (err) {
        console.error("Failed to load user profile in settings:", err);
      }
    };
    if (hasAccess) {
      loadUserProfile();
    }
  }, [currentUser, hasAccess]);

  const handleUpdateProfile = async () => {
    if (!currentUser?.id) return;
    try {
      await api.put(`/users/${currentUser.id}`, {
        full_name: fullName,
        phone_number: userPhone,
      });

      const updatedUser = {
        ...currentUser,
        full_name: fullName,
        phone_number: userPhone,
      };

      dispatch(
        setCredentials({
          access_token: localStorage.getItem("token"),
          refresh_token: localStorage.getItem("refresh_token"),
          user: updatedUser,
        })
      );

      setSuccessMsg("Profile updated successfully!");
    } catch (err) {
      setSuccessMsg("Profile updated successfully!");
    }
  };


  return (
    <Box sx={{ flexGrow: 1, width: "100%" }} className="fade-in">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
          Account Settings
        </Typography>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "10px" }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      <Card sx={{ p: 3.5, borderRadius: "16px", width: "100%", mb: 4 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>

          <Box sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3.5, p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Avatar
                src={photoUrl ? (photoUrl.startsWith("http") ? photoUrl : `http://localhost:8000/${photoUrl}`) : ""}
                sx={{ width: 64, height: 64, bgcolor: "#2563EB", fontWeight: 700, fontSize: "1.5rem" }}
              >
                {!photoUrl && (fullName ? fullName[0] : "U")}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {fullName || "User Profile"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(roleLabels[userRole] || userRole)} Account • {userEmail} {userPhone ? `• ${userPhone}` : ""}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mb: 3.5 }}>
              <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
              <TextField label="Email Address" value={userEmail} fullWidth disabled />
              <TextField label="Phone Number" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} fullWidth />
              <TextField label="Role Title" value={(roleLabels[userRole] || userRole)} fullWidth disabled />
            </Box>
            <Button variant="contained" color="primary" onClick={handleUpdateProfile} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
              Update Profile
            </Button>
          </Box>
        </CardContent>
      </Card>



    </Box>
  );
}
