import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import api from "../services/api";
import logoImg from "../assets/logo/logo.png";
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
  Collapse,
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
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { logOut } from "../redux/authSlice";

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  STAFF: "Staff",
  TENANT: "Tenant"
};

const drawerWidth = 260;

// Owner & Super Admin Menu Items
const ownerMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  {
    isGroup: true,
    groupKey: "property_management",
    title: "PROPERTY MANAGEMENT",
    items: [
      { text: "Properties", icon: <BusinessIcon />, path: "/properties" },
      { text: "Floors", icon: <BusinessIcon />, path: "/floors" },
      { text: "Rooms", icon: <RoomIcon />, path: "/rooms" },
      { text: "Beds", icon: <BedIcon />, path: "/beds" },
    ],
  },
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
  {
    isGroup: true,
    groupKey: "property_management",
    title: "PROPERTY MANAGEMENT",
    items: [
      { text: "Properties (Assigned)", icon: <BusinessIcon />, path: "/properties" },
      { text: "Rooms", icon: <RoomIcon />, path: "/rooms" },
      { text: "Beds", icon: <BedIcon />, path: "/beds" },
    ],
  },
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
    if (user.designation === "Property Manager") {
      activeMenuItems = managerMenuItems;
    } else if (user.designation === "Accountant") {
      activeMenuItems = accountantMenuItems;
    } else {
      activeMenuItems = staffMenuItems;
    }
  }

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openPropMgmt, setOpenPropMgmt] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);

  const loadNotificationsData = async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data || []);

      const stored = localStorage.getItem("read_notifications");
      setReadIds(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error("Failed to load notifications in layout:", e);
    }
  };

  useEffect(() => {
    if (user && user.id) {
      loadNotificationsData();
    }
  }, [user, location.pathname]);

  const unreadNotifications = notifications.filter((n) => !readIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

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
            px: 2,
            py: 2,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
          }}
        >
          {!isCollapsed ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  width: "100%",
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  px: 1.5,
                  py: 0.8,
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <img
                  src={logoImg}
                  alt="Accoumaxx Logo"
                  style={{
                    maxHeight: 42,
                    maxWidth: "100%",
                    objectFit: "contain",
                    filter: "brightness(1.15) contrast(1.1)",
                  }}
                />
              </Box>
              <IconButton size="small" sx={{ color: "#94A3B8", ml: 1 }}>
                <ChevronLeftIcon />
              </IconButton>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                width: "100%",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                p: 0.8,
                borderRadius: "10px",
              }}
            >
              <img
                src={logoImg}
                alt="Accoumaxx Logo"
                style={{
                  maxHeight: 36,
                  maxWidth: "100%",
                  objectFit: "contain",
                  filter: "brightness(1.15) contrast(1.1)",
                }}
              />
              <ChevronRightIcon sx={{ color: "#94A3B8", fontSize: "0.9rem" }} />
            </Box>
          )}
        </Toolbar>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 1.5 }} />

        {/* Menu Items List */}
        <List sx={{ px: 1.5 }}>
          {activeMenuItems.map((item, index) => {
            if (item.isGroup) {
              if (isCollapsed) {
                return item.items.map((subItem, subIdx) => {
                  const isSubSelected =
                    subItem.path === "/"
                      ? location.pathname === "/"
                      : location.pathname === subItem.path || location.pathname.startsWith(subItem.path + "/");
                  return (
                    <ListItemButton
                      key={`${index}-${subIdx}`}
                      component={Link}
                      to={subItem.path}
                      selected={isSubSelected}
                      onClick={() => setMobileOpen(false)}
                      sx={{
                        borderRadius: "12px",
                        mb: 0.75,
                        justifyContent: "center",
                        px: 1.5,
                        py: 1.2,
                        color: isSubSelected ? "#FFFFFF" : "#94A3B8",
                        bgcolor: isSubSelected ? "#10B981" : "transparent",
                        boxShadow: isSubSelected ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                        "&:hover": {
                          bgcolor: isSubSelected ? "#059669" : "rgba(255, 255, 255, 0.06)",
                          color: "#FFFFFF",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: isSubSelected ? "#FFFFFF" : "#94A3B8", minWidth: 0, justifyContent: "center" }}>
                        {subItem.icon}
                      </ListItemIcon>
                    </ListItemButton>
                  );
                });
              }

              const isGroupActive = item.items.some(
                (sub) => location.pathname === sub.path || (sub.path !== "/" && location.pathname.startsWith(sub.path + "/"))
              );

              if (!openPropMgmt) {
                // CLOSED State: Image 1 style (Property Management tab with icon and chevron arrow)
                return (
                  <ListItemButton
                    key={index}
                    onClick={() => setOpenPropMgmt(true)}
                    sx={{
                      borderRadius: "12px",
                      mb: 0.75,
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      px: isCollapsed ? 1.5 : 2,
                      py: 1.2,
                      color: isGroupActive ? "#FFFFFF" : "#94A3B8",
                      bgcolor: isGroupActive ? "#10B981" : "transparent",
                      boxShadow: isGroupActive ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: isGroupActive ? "#059669" : "rgba(255, 255, 255, 0.06)",
                        color: "#FFFFFF",
                        transform: "translateX(2px)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isGroupActive ? "#FFFFFF" : "#94A3B8",
                        minWidth: isCollapsed ? 0 : 38,
                        justifyContent: "center",
                      }}
                    >
                      <BusinessIcon />
                    </ListItemIcon>
                    {!isCollapsed && (
                      <>
                        <ListItemText
                          primary="Property Management"
                          primaryTypographyProps={{
                            fontSize: "0.875rem",
                            fontWeight: isGroupActive ? 700 : 500,
                          }}
                        />
                        <ExpandLess sx={{ fontSize: 20, color: isGroupActive ? "#FFFFFF" : "#94A3B8" }} />
                      </>
                    )}
                  </ListItemButton>
                );
              }

              // OPEN State: Image 2 style (PROPERTY MANAGEMENT header + Properties, Floors, Rooms, Beds list)
              return (
                <Box key={index} sx={{ mb: 1 }}>
                  {!isCollapsed && (
                    <ListItemButton
                      onClick={() => setOpenPropMgmt(false)}
                      sx={{
                        py: 0.8,
                        px: 1.5,
                        mt: 1,
                        mb: 0.5,
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#94A3B8",
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.72rem",
                          color: "#94A3B8",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        PROPERTY MANAGEMENT
                      </Typography>
                      <ExpandLess sx={{ fontSize: 18, color: "#94A3B8" }} />
                    </ListItemButton>
                  )}
                  <List component="div" disablePadding>
                    {item.items.map((subItem, subIdx) => {
                      const isSubSelected =
                        subItem.path === "/"
                          ? location.pathname === "/"
                          : location.pathname === subItem.path || location.pathname.startsWith(subItem.path + "/");
                      return (
                        <ListItemButton
                          key={subIdx}
                          component={Link}
                          to={subItem.path}
                          selected={isSubSelected}
                          onClick={() => setMobileOpen(false)}
                          sx={{
                            borderRadius: "12px",
                            mb: 0.75,
                            justifyContent: isCollapsed ? "center" : "flex-start",
                            px: isCollapsed ? 1.5 : 2,
                            py: 1.2,
                            color: isSubSelected ? "#FFFFFF" : "#94A3B8",
                            bgcolor: isSubSelected ? "#10B981" : "transparent",
                            boxShadow: isSubSelected ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              bgcolor: isSubSelected ? "#059669" : "rgba(255, 255, 255, 0.06)",
                              color: "#FFFFFF",
                              transform: "translateX(2px)",
                            },
                            "&.Mui-selected": {
                              bgcolor: "#10B981",
                              color: "#FFFFFF",
                              "& .MuiListItemIcon-root": { color: "#FFFFFF" },
                              "&:hover": { bgcolor: "#059669" },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              color: isSubSelected ? "#FFFFFF" : "#94A3B8",
                              minWidth: isCollapsed ? 0 : 38,
                              justifyContent: "center",
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          {!isCollapsed && (
                            <ListItemText
                              primary={subItem.text}
                              primaryTypographyProps={{
                                fontSize: "0.875rem",
                                fontWeight: isSubSelected ? 700 : 500,
                              }}
                            />
                          )}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>
              );
            }

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
                  bgcolor: isSelected ? "#10B981" : "transparent",
                  boxShadow: isSelected ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: isSelected ? "#059669" : "rgba(255, 255, 255, 0.06)",
                    color: "#FFFFFF",
                    transform: "translateX(2px)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#10B981",
                    color: "#FFFFFF",
                    "& .MuiListItemIcon-root": { color: "#FFFFFF" },
                    "&:hover": { bgcolor: "#059669" },
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
        <Box
          sx={{
            p: 2,
            m: 1.5,
            borderRadius: "12px",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar
            src={user?.photo_url ? (user.photo_url.startsWith("http") ? user.photo_url : `http://localhost:8000/${user.photo_url}`) : ""}
            sx={{ bgcolor: "#2563EB", width: 38, height: 38, fontWeight: 700, fontSize: "1rem" }}
          >
            {!user?.photo_url && (user?.full_name ? user.full_name[0] : "U")}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>

            <Typography variant="body2" fontWeight={700} color="#FFFFFF" noWrap sx={{ mb: 0.25 }}>
              {user.full_name || "User Account"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 700, letterSpacing: "0.02em", display: "block" }}>
              {user.role ? (roleLabels[user.role] || user.role) : ""}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default", width: "100%" }}>
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
              <Badge badgeContent={unreadCount} color="error">
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
                <Typography
                  variant="caption"
                  color="primary"
                  fontWeight={700}
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    const allIds = notifications.map((n) => n.id);
                    setReadIds(allIds);
                    localStorage.setItem("read_notifications", JSON.stringify(allIds));
                    handleNotifMenuClose();
                  }}
                >
                  Mark all read
                </Typography>
              </Box>
              <Divider />
              {unreadNotifications.slice(0, 5).map((n) => {
                const displayTime = n.created_at
                  ? new Date(n.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "Recent";
                return (
                  <MenuItem
                    key={n.id}
                    onClick={() => {
                      const newRead = [...readIds, n.id];
                      setReadIds(newRead);
                      localStorage.setItem("read_notifications", JSON.stringify(newRead));
                      handleNotifMenuClose();
                      navigate("/notifications");
                    }}
                    sx={{ py: 1.5, borderRadius: "10px", my: 0.5 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280, display: "block" }}>
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{displayTime}</Typography>
                    </Box>
                  </MenuItem>
                );
              })}
              {unreadNotifications.length === 0 && (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No unread notifications.
                  </Typography>
                </Box>
              )}
              <Divider />
              <MenuItem
                onClick={() => {
                  handleNotifMenuClose();
                  navigate("/notifications");
                }}
                sx={{ justifyContent: "center", py: 1, borderRadius: "10px", mt: 0.5 }}
              >
                <Typography variant="caption" color="primary" fontWeight={700}>
                  View All Notifications
                </Typography>
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
              <Avatar
                src={user?.photo_url ? (user.photo_url.startsWith("http") ? user.photo_url : `http://localhost:8000/${user.photo_url}`) : ""}
                sx={{ bgcolor: "#2563EB", width: 34, height: 34, fontWeight: 700, fontSize: "0.875rem" }}
              >
                {!user?.photo_url && (user?.full_name ? user.full_name[0] : "U")}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Typography variant="body2" fontWeight={700} color="text.primary" lineHeight={1.2}>
                  {user.full_name || "Account User"}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {user.designation || (user.role ? (roleLabels[user.role] || user.role) : "")}
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
