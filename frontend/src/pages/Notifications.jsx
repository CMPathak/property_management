import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Card,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Notifications as BellIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import api from "../services/api";

export default function Notifications() {
  const user = useSelector((state) => state.auth.user);
  const isManagement = user?.role === "SUPER_ADMIN" || user?.role === "OWNER" || (user?.role === "STAFF" && user?.designation === "Property Manager");

  const [notifications, setNotifications] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem("read_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data || []);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("read_notifications", JSON.stringify(allIds));
  };

  const handleAddAnnouncement = async () => {
    if (!newTitle || !newBody) {
      alert("Please fill in both title and message.");
      return;
    }
    try {
      await api.post("/notifications/", {
        title: newTitle,
        body: newBody,
        type: "PUSH",
      });
      setNewTitle("");
      setNewBody("");
      setOpenAddDialog(false);
      fetchNotifications();
    } catch (e) {
      alert("Failed to publish announcement.");
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Notifications
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {isManagement && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
              New Announcement
            </Button>
          )}
          <Button variant="outlined" color="primary" onClick={handleMarkAllRead}>
            Mark All as Read
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {notifications.map((n) => {
          const isRead = readIds.includes(n.id);
          const icon = <BellIcon sx={{ color: "#2563EB" }} />;
          const bg = "rgba(37, 99, 235, 0.1)";

          const displayTime = n.created_at
            ? new Date(n.created_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Recent";

          return (
            <Card
              key={n.id}
              sx={{
                p: 2.5,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: isRead ? "background.paper" : "rgba(37, 99, 235, 0.03)",
                border: isRead ? "1px solid #E2E8F0" : "1px solid #2563EB",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: bg, width: 44, height: 44 }}>{icon}</Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={700} color="text.primary">
                    {n.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {n.body}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: "right", minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  {displayTime}
                </Typography>
                {!isRead && <Chip label="NEW" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />}
              </Box>
            </Card>
          );
        })}

        {notifications.length === 0 && (
          <Card sx={{ p: 4, textAlign: "center", border: "1px dashed #CBD5E1" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications or announcements found.
            </Typography>
          </Card>
        )}
      </Box>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Announcement</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Announcement Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Announcement Body"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAnnouncement} variant="contained" color="primary">
            Publish Announcement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
