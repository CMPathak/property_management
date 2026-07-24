import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  InputBase,
  Breadcrumbs,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  MeetingRoom as RoomIcon,
  SingleBed as BedIcon,
  People as PeopleIcon,
  CurrencyRupee as MoneyIcon,
  ReportProblem as ComplaintIcon,
  Badge as StaffIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Notifications as BellIcon,
  Search as SearchIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ExitToApp as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { logOut } from "../redux/authSlice";

const drawerWidth = 260;

// Owner & Super Admin Menu Items
const ownerMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Properties", icon: <BusinessIcon />, path: "/properties" },
  { text: "Floors", icon: <BusinessIcon />, path: "/floors" },
  { text: "Rooms", icon: <RoomIcon />, path: "/rooms" },
  { text: "Beds", icon: <BedIcon />, path: "/beds" },
  { text: "Tenants", icon: <PeopleIcon />, path: "/tenants" },
  { text: "Rent Management", icon: <MoneyIcon />, path: "/rent" },
  { text: "Agreements", icon: <AssessmentIcon />, path: "/agreements" },
  { text: "Complaints", icon: <ComplaintIcon />, path: "/complaints" },
  { text: "Staff", icon: <StaffIcon />, path: "/staff" },
  { text: "Attendance", icon: <StaffIcon />, path: "/attendance" },
  { text: "Expenses", icon: <BusinessIcon />, path: "/expenses" },
  { text: "Reports", icon: <AssessmentIcon />, path: "/reports" },
  { text: "Notifications", icon: <BellIcon />, path: "/notifications" },
  { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

// Tenant Menu Items
const tenantMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "My Room", icon: <RoomIcon />, path: "/rooms" },
  { text: "My Rent", icon: <MoneyIcon />, path: "/rent" },
  { text: "Payments", icon: <MoneyIcon />, path: "/payments" },
  { text: "Agreement", icon: <AssessmentIcon />, path: "/agreements" },
  { text: "My Complaints", icon: <ComplaintIcon />, path: "/complaints" },
  { text: "Notifications", icon: <BellIcon />, path: "/notifications" },
  { text: "Profile", icon: <SettingsIcon />, path: "/settings" },
];

// Staff Menu Items
const staffMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "My Complaints", icon: <ComplaintIcon />, path: "/complaints" },
  { text: "My Tasks", icon: <AssessmentIcon />, path: "/tasks" },
  { text: "Attendance", icon: <StaffIcon />, path: "/attendance" },
  { text: "Notifications", icon: <BellIcon />, path: "/notifications" },
  { text: "Profile", icon: <SettingsIcon />, path: "/settings" },
];

// Accountant Menu Items
const accountantMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Rent Management", icon: <MoneyIcon />, path: "/rent" },
  { text: "Payments", icon: <MoneyIcon />, path: "/payments" },
  { text: "Invoices", icon: <AssessmentIcon />, path: "/invoices" },
  { text: "Expenses", icon: <BusinessIcon />, path: "/expenses" },
  { text: "Financial Reports", icon: <AssessmentIcon />, path: "/reports" },
  { text: "Notifications", icon: <BellIcon />, path: "/notifications" },
];

// Manager Menu Items
const managerMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Properties (Assigned)", icon: <BusinessIcon />, path: "/properties" },
  { text: "Rooms", icon: <RoomIcon />, path: "/rooms" },
  { text: "Beds", icon: <BedIcon />, path: "/beds" },
  { text: "Tenants", icon: <PeopleIcon />, path: "/tenants" },
  { text: "Rent", icon: <MoneyIcon />, path: "/rent" },
  { text: "Agreements", icon: <AssessmentIcon />, path: "/agreements" },
  { text: "Complaints", icon: <ComplaintIcon />, path: "/complaints" },
  { text: "Staff", icon: <StaffIcon />, path: "/staff" },
  { text: "Attendance", icon: <PeopleIcon />, path: "/attendance" },
  { text: "Notifications", icon: <BellIcon />, path: "/notifications" },
  { text: "Reports", icon: <AssessmentIcon />, path: "/reports" },
];

export default function MainLayout({ toggleTheme, mode }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user) || {
    full_name: "Rajesh Sharma",
    role: "OWNER",
    email: "owner@accoumaxx.com",
  };

  let activeMenuItems = ownerMenuItems;
  if (user.role === "TENANT") {
    activeMenuItems = tenantMenuItems;
  } else if (user.role === "STAFF") {
    activeMenuItems = staffMenuItems;
  } else if (user.role === "ACCOUNTANT") {
    activeMenuItems = accountantMenuItems;
  } else if (user.role === "MANAGER") {
    activeMenuItems = managerMenuItems;
  }

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const currentDrawerWidth = isCollapsed ? 76 : drawerWidth;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleProfileMenuOpen = (e) => setProfileAnchor(e.currentTarget);
  const handleProfileMenuClose = () => setProfileAnchor(null);

  const handleNotifMenuOpen = (e) => setNotifAnchor(e.currentTarget);
  const handleNotifMenuClose = () => setNotifAnchor(null);

  const handleLogout = () => {
    dispatch(logOut());
    navigate("/login");
  };

  const pathnames = location.pathname.split("/").filter((x) => x);

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#0F172A",
        color: "#FFFFFF",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box>
        {/* Brand Header */}
        <Toolbar
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            px: 2.5,
            py: 2,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
          }}
        >
          {!isCollapsed ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: "#2563EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
                  }}
                >
                  <BusinessIcon sx={{ color: "#FFFFFF", fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                  ACCOUMAXX
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: "#94A3B8" }}>
                <ChevronLeftIcon />
              </IconButton>
            </>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BusinessIcon sx={{ color: "#FFFFFF", fontSize: 20 }} />
              </Box>
              <ChevronRightIcon sx={{ color: "#94A3B8", fontSize: "0.9rem" }} />
            </Box>
          )}
        </Toolbar>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 1.5 }} />

        {/* Menu Items List */}
        <List sx={{ px: 1.5 }}>
          {activeMenuItems.map((item, index) => {
            const isSelected =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <ListItemButton
                key={index}
                component={Link}
                to={item.path}
                selected={isSelected}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: "12px",
                  mb: 0.75,
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  px: isCollapsed ? 1.5 : 2,
                  py: 1.2,
                  color: isSelected ? "#FFFFFF" : "#94A3B8",
                  bgcolor: isSelected ? "#2563EB" : "transparent",
                  boxShadow: isSelected ? "0 4px 12px rgba(37,99,235,0.3)" : "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: isSelected ? "#1D4ED8" : "rgba(255, 255, 255, 0.06)",
                    color: "#FFFFFF",
                    transform: "translateX(2px)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#2563EB",
                    color: "#FFFFFF",
                    "& .MuiListItemIcon-root": { color: "#FFFFFF" },
                    "&:hover": { bgcolor: "#1D4ED8" },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? "#FFFFFF" : "#94A3B8",
                    minWidth: isCollapsed ? 0 : 38,
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: isSelected ? 700 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* User Footer inside Drawer */}
      {!isCollapsed && (
        <Box sx={{ p: 2, m: 1.5, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 0.5, fontWeight: 600 }}>
            LOGGED IN AS
          </Typography>
          <Typography variant="body2" fontWeight={700} color="#FFFFFF" noWrap>
            {user.full_name || "User Account"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700 }}>
            {user.role}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Top Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid #E2E8F0",
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1.5, sm: 3 }, height: 70 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: { xs: 1, sm: 2 }, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Global Search Bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#F8FAFC",
              px: { xs: 1.25, sm: 2 },
              py: 0.75,
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              flex: 1,
              maxWidth: { xs: "100%", sm: 300, md: 380 },
              mr: { xs: 1, sm: 2 },
              transition: "border-color 0.2s",
              "&:focus-within": { borderColor: "#2563EB" },
            }}
          >
            <SearchIcon sx={{ color: "text.secondary", mr: { xs: 0.75, sm: 1.5 }, fontSize: 20 }} />
            <InputBase
              placeholder="Search..."
              sx={{ fontSize: "0.875rem", width: "100%", fontWeight: 500 }}
            />
          </Box>

          {/* Header Options */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.5 } }}>
            {/* Theme Switcher */}
            <IconButton onClick={toggleTheme} color="inherit" sx={{ bgcolor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0", p: { xs: 0.75, sm: 1 } }}>
              {mode === "dark" ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
            </IconButton>

            {/* Notifications */}
            <IconButton onClick={handleNotifMenuOpen} color="inherit" sx={{ bgcolor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0", p: { xs: 0.75, sm: 1 } }}>
              <Badge badgeContent={3} color="error">
                <BellIcon fontSize="small" />
              </Badge>
            </IconButton>

            {/* Notification Menu */}
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={handleNotifMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{ sx: { width: { xs: 290, sm: 340 }, mt: 1.5, borderRadius: "16px", p: 1 } }}
            >
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
                <Typography variant="caption" color="primary" fontWeight={700} sx={{ cursor: "pointer" }}>Mark all read</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleNotifMenuClose} sx={{ py: 1.5, borderRadius: "10px", my: 0.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>Rent invoice generated for July</Typography>
                  <Typography variant="caption" color="text.secondary">10 mins ago</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleNotifMenuClose} sx={{ py: 1.5, borderRadius: "10px", my: 0.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>Payment confirmed (₹6,000)</Typography>
                  <Typography variant="caption" color="text.secondary">30 mins ago</Typography>
                </Box>
              </MenuItem>
            </Menu>

            <Divider orientation="vertical" flexItem sx={{ my: 1.5, mx: { xs: 0.25, sm: 0.5 } }} />

            {/* User Profile */}
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                cursor: "pointer",
                p: 0.5,
                borderRadius: "10px",
                "&:hover": { bgcolor: "#F8FAFC" },
              }}
            >
              <Avatar sx={{ bgcolor: "#2563EB", width: 34, height: 34, fontWeight: 700, fontSize: "0.875rem" }}>
                {user?.full_name ? user.full_name[0] : "U"}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Typography variant="body2" fontWeight={700} color="text.primary" lineHeight={1.2}>
                  {user.full_name || "Account User"}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {user.designation || user.role}
                </Typography>
              </Box>
            </Box>

            {/* Profile Dropdown */}
            <Menu
              anchorEl={profileAnchor}
              open={Boolean(profileAnchor)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{ sx: { width: 200, mt: 1.5, borderRadius: "14px", p: 0.5 } }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate("/settings"); }} sx={{ borderRadius: "8px", py: 1 }}>
                My Settings & Profile
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ borderRadius: "8px", color: "error.main", py: 1 }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { sm: currentDrawerWidth },
          flexShrink: { sm: 0 },
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: currentDrawerWidth,
              borderRight: "none",
              transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Page Canvas */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2.5, md: 3.5 },
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          mt: "70px",
          minHeight: "calc(100vh - 70px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumbs sx={{ mb: 2, overflowX: "auto", py: 0.5, "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" } }}>
          <Link to="/" style={{ textDecoration: "none", color: "#64748B", fontWeight: 600, fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
            Portal
          </Link>
          {pathnames.map((value, index) => {
            const last = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join("/")}`;
            const label = value.charAt(0).toUpperCase() + value.slice(1);

            return last ? (
              <Typography key={to} color="text.primary" sx={{ fontSize: "0.8125rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                {label}
              </Typography>
            ) : (
              <Link key={to} to={to} style={{ textDecoration: "none", color: "#64748B", fontWeight: 600, fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                {label}
              </Link>
            );
          })}
        </Breadcrumbs>

        <Outlet />
      </Box>
    </Box>
  );
}
