import React, { useState } from "react";
import {
  Typography,
  Box,
  Card,
  Chip,
  Avatar,
  IconButton,
  Button,
} from "@mui/material";
import {
  Notifications as BellIcon,
  CheckCircle as DoneIcon,
  ReportProblem as AlertIcon,
  CurrencyRupee as RentIcon,
} from "@mui/icons-material";

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Rent Due Reminder Sent", message: "Automated rent invoice notification dispatched to Room 101 tenants.", time: "10 mins ago", type: "INFO", read: false },
    { id: 2, title: "New Complaint Logged", message: "Plumbing issue logged by Rajesh for Room 102.", time: "1 hour ago", type: "WARNING", read: false },
    { id: 3, title: "Payment Received", message: "₹6,000 rent payment verified for Room 201.", time: "3 hours ago", type: "SUCCESS", read: true },
    { id: 4, title: "Bed Allocation Confirmed", message: "Ankush Mishra assigned to Room 101 - Bed 12.", time: "Yesterday", type: "SUCCESS", read: true },
  ]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            System Notifications & Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with rent reminders, tenant check-ins, maintenance complaints, and payment confirmations.
          </Typography>
        </Box>
        <Button variant="outlined" color="primary" onClick={handleMarkAllRead}>
          Mark All as Read
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {notifications.map((n) => {
          let icon = <BellIcon sx={{ color: "#2563EB" }} />;
          let bg = "rgba(37, 99, 235, 0.1)";
          if (n.type === "SUCCESS") {
            icon = <RentIcon sx={{ color: "#16A34A" }} />;
            bg = "rgba(34, 197, 94, 0.1)";
          } else if (n.type === "WARNING") {
            icon = <AlertIcon sx={{ color: "#DC2626" }} />;
            bg = "rgba(239, 68, 68, 0.1)";
          }

          return (
            <Card
              key={n.id}
              sx={{
                p: 2.5,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justify: "space-between",
                bgcolor: n.read ? "background.paper" : "rgba(37, 99, 235, 0.03)",
                border: n.read ? "1px solid #E2E8F0" : "1px solid #2563EB",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: bg, width: 44, height: 44 }}>{icon}</Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={700} color="text.primary">
                    {n.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {n.message}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  {n.time}
                </Typography>
                {!n.read && <Chip label="NEW" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />}
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
