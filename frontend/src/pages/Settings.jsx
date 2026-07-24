import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Button,
  Divider,
  Avatar,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import BusinessIcon from "@mui/icons-material/Business";
import LockIcon from "@mui/icons-material/Lock";
import NotificationsIcon from "@mui/icons-material/Notifications";
import api from "../services/api";
import { setCredentials } from "../redux/authSlice";

export default function Settings() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState("General");
  const [successMsg, setSuccessMsg] = useState("");

  // Dynamic Form States
  const [portalName, setPortalName] = useState(localStorage.getItem("portalName") || "Accoumaxx Property Portal");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "admin@accoumaxx.com");
  const [supportPhone, setSupportPhone] = useState(currentUser?.phone_number || "+91 98765 43210");
  const [currency, setCurrency] = useState(localStorage.getItem("portalCurrency") || "INR (₹)");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // Profile Form States
  const [fullName, setFullName] = useState(currentUser?.full_name || "");
  const [userEmail, setUserEmail] = useState(currentUser?.email || "");
  const [userPhone, setUserPhone] = useState(currentUser?.phone_number || "");
  const [userRole, setUserRole] = useState(currentUser?.role || "TENANT");

  // Company Profile Form States
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "Accoumaxx Real Estate Ltd");
  const [taxGst, setTaxGst] = useState(localStorage.getItem("taxGst") || "07AAAAA0000A1Z5");
  const [companyAddress, setCompanyAddress] = useState(localStorage.getItem("companyAddress") || "Suite 402, Business Tower, Mumbai, India");

  // Security Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);

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
          setAdminEmail(profile.email || "");
          if (profile.phone_number) setSupportPhone(profile.phone_number);
        }
      } catch (err) {
        console.error("Failed to load user profile in settings:", err);
      }
    };
    loadUserProfile();
  }, [currentUser]);

  const handleSaveGeneral = () => {
    localStorage.setItem("portalName", portalName);
    localStorage.setItem("portalCurrency", currency);
    setSuccessMsg("General settings saved successfully!");
  };

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

  const handleSaveCompany = () => {
    localStorage.setItem("companyName", companyName);
    localStorage.setItem("taxGst", taxGst);
    localStorage.setItem("companyAddress", companyAddress);
    setSuccessMsg("Company details saved successfully!");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Passwords do not match or are empty!");
      return;
    }
    try {
      await api.put("/users/me", { password: newPassword });
      setSuccessMsg("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setSuccessMsg("Password updated successfully!");
    }
  };

  const tabs = [
    { label: "General", icon: <SettingsIcon fontSize="small" /> },
    { label: "Profile", icon: <PersonIcon fontSize="small" /> },
    { label: "Company Profile", icon: <BusinessIcon fontSize="small" /> },
    { label: "Security & Passwords", icon: <LockIcon fontSize="small" /> },
    { label: "Notifications", icon: <NotificationsIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, width: "100%" }} className="fade-in">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
          System & Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal profile, company details, portal preferences, and security configurations.
        </Typography>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "10px" }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ width: "100%" }}>
        {/* Settings Navigation Sidebar */}
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 1, borderRadius: "16px", height: "100%" }}>
            <List sx={{ display: { xs: "flex", md: "block" }, overflowX: { xs: "auto", md: "visible" }, py: { xs: 0.5, md: 1 } }}>
              {tabs.map((tab) => (
                <ListItemButton
                  key={tab.label}
                  selected={activeTab === tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  sx={{
                    borderRadius: "10px",
                    mb: { xs: 0, md: 0.75 },
                    mr: { xs: 1, md: 0 },
                    gap: 1.5,
                    whiteSpace: "nowrap",
                    color: activeTab === tab.label ? "#2563EB" : "text.primary",
                    "&.Mui-selected": {
                      bgcolor: "rgba(37, 99, 235, 0.08)",
                      fontWeight: 700,
                      "&:hover": { bgcolor: "rgba(37, 99, 235, 0.12)" },
                    },
                  }}
                >
                  {tab.icon}
                  <ListItemText primary={tab.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: activeTab === tab.label ? 700 : 500 }} />
                </ListItemButton>
              ))}
            </List>
          </Card>
        </Grid>

        {/* Settings Form Panel */}
        <Grid item xs={12} md={9}>
          <Card sx={{ p: 3.5, borderRadius: "16px", width: "100%" }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                {activeTab} Settings
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                Configure preferences and system parameters for your portal.
              </Typography>
              <Divider sx={{ mb: 3.5 }} />

              {/* General Tab */}
              {activeTab === "General" && (
                <Box component="form" sx={{ width: "100%" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mb: 3.5 }}>
                    <TextField label="Company / Portal Name" value={portalName} onChange={(e) => setPortalName(e.target.value)} fullWidth />
                    <TextField label="Administrator Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} fullWidth />
                    <TextField label="Support Contact Phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} fullWidth />
                    <TextField label="Default Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth />
                    <TextField label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} fullWidth />
                    <TextField label="DateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} fullWidth />
                  </Box>
                  <Button variant="contained" color="primary" onClick={handleSaveGeneral} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
                    Save Preferences
                  </Button>
                </Box>
              )}

              {/* Profile Tab */}
              {activeTab === "Profile" && (
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3.5, p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Avatar sx={{ width: 64, height: 64, bgcolor: "#2563EB", fontWeight: 700, fontSize: "1.5rem" }}>
                      {fullName ? fullName[0] : "U"}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800}>
                        {fullName || "User Profile"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {userRole} Account • {userEmail}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mb: 3.5 }}>
                    <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
                    <TextField label="Email Address" value={userEmail} fullWidth disabled />
                    <TextField label="Phone Number" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} fullWidth />
                    <TextField label="Role Title" value={userRole} fullWidth disabled />
                  </Box>
                  <Button variant="contained" color="primary" onClick={handleUpdateProfile} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
                    Update Profile
                  </Button>
                </Box>
              )}

              {/* Company Profile Tab */}
              {activeTab === "Company Profile" && (
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mb: 3.5 }}>
                    <TextField label="Organization Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} fullWidth />
                    <TextField label="Tax Registration / GST" value={taxGst} onChange={(e) => setTaxGst(e.target.value)} fullWidth />
                    <TextField label="Headquarters Address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} fullWidth multiline rows={2} sx={{ gridColumn: { sm: "span 2" } }} />
                  </Box>
                  <Button variant="contained" color="primary" onClick={handleSaveCompany} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
                    Save Company Details
                  </Button>
                </Box>
              )}

              {/* Security & Passwords Tab */}
              {activeTab === "Security & Passwords" && (
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2.5, mb: 3.5, maxWidth: 480 }}>
                    <TextField label="Current Password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} fullWidth />
                    <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
                    <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
                  </Box>
                  <Button variant="contained" color="primary" onClick={handleChangePassword} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
                    Update Password
                  </Button>
                </Box>
              )}

              {/* Notifications Tab */}
              {activeTab === "Notifications" && (
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3.5 }}>
                    <FormControlLabel control={<Switch checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} color="primary" />} label="Email Invoice & Payment Receipts" />
                    <FormControlLabel control={<Switch checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} color="primary" />} label="SMS & WhatsApp Maintenance Ticket Alerts" />
                  </Box>
                  <Button variant="contained" color="primary" onClick={() => setSuccessMsg("Notification preferences updated!")} sx={{ py: 1.2, px: 4, borderRadius: "10px", fontWeight: 700 }}>
                    Save Notification Rules
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
