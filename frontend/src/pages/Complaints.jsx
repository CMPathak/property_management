import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
} from "@mui/material";
import {
  Add as AddIcon,
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Complaints() {
  const user = useSelector((state) => state.auth.user);

  const [complaints, setComplaints] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [complaintToEdit, setComplaintToEdit] = useState(null);
  const [complaintToView, setComplaintToView] = useState(null);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("OTHER");
  const [newTenantId, setNewTenantId] = useState("");

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("OTHER");
  const [editStatus, setEditStatus] = useState("OPEN");

  const formatError = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => (e.msg ? e.msg : JSON.stringify(e))).join("\n");
    }
    if (typeof detail === "object") return JSON.stringify(detail);
    return String(detail);
  };

  const fetchData = async () => {
    let tenantsList = [];
    try {
      // 1. Fetch tenant profiles
      const tenantsRes = await api.get("/tenants/");
      tenantsList = tenantsRes.data || [];
    } catch (err) {
      console.error("Failed to load tenant profiles:", err);
    }

    // 2. Fetch users to merge any user with role TENANT into list
    try {
      const usersRes = await api.get("/users/");
      const tenantUsers = (usersRes.data || []).filter((u) => u.role === "TENANT");
      const existingUserIds = new Set(tenantsList.map((t) => t.user_id).filter(Boolean));
      const existingEmails = new Set(tenantsList.map((t) => t.email).filter(Boolean));

      tenantUsers.forEach((u) => {
        if (!existingUserIds.has(u.id) && !existingEmails.has(u.email)) {
          tenantsList.push({
            id: u.id,
            user_id: u.id,
            full_name: u.full_name || u.email.split("@")[0],
            email: u.email,
            room_bed: "Unassigned",
          });
        }
      });
    } catch (e) {
      console.error("Failed to merge tenant users:", e);
    }

    setTenants(tenantsList);

    // 3. Fetch complaints and enrich tenant name
    try {
      const response = await api.get("/complaints/");
      const rawComplaints = response.data || [];

      const enriched = rawComplaints.map((c) => {
        let tName = c.tenant_name;
        if (!tName && c.tenant_profile_id && tenantsList.length > 0) {
          const matchedTenant = tenantsList.find(
            (t) => t.id === c.tenant_profile_id || t.user_id === c.tenant_profile_id
          );
          if (matchedTenant) tName = matchedTenant.full_name || matchedTenant.email;
        }
        return {
          ...c,
          tenant_name: tName || "Resident",
        };
      });

      // Sort Date-wise (Newest first)
      enriched.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      // Filter: Tenants only see their own complaints, Admin / Managers see ALL
      if (user?.role === "TENANT") {
        const userTenant = tenantsList.find(
          (t) =>
            t.user_id === user.id ||
            t.id === user.id ||
            (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase())
        );
        const myTenantId = userTenant?.id;
        const myUserId = user.id;

        const tenantOnlyComplaints = enriched.filter((c) => {
          return (
            (myTenantId && c.tenant_profile_id === myTenantId) ||
            (c.created_by && c.created_by === myUserId) ||
            (c.tenant_name && user.full_name && c.tenant_name.toLowerCase() === user.full_name.toLowerCase()) ||
            (c.tenant_name && user.email && c.tenant_name.toLowerCase().includes(user.email.split("@")[0].toLowerCase()))
          );
        });
        setComplaints(tenantOnlyComplaints);
      } else {
        setComplaints(enriched);
      }
    } catch (err) {
      console.error("Failed to load complaints:", err);
      setComplaints([]);
    }

    // Ensure current logged-in user is present and selected by default
    if (user) {
      const userIndex = tenantsList.findIndex(
        (t) =>
          (t.id && user.id && t.id === user.id) ||
          (t.user_id && user.id && t.user_id === user.id) ||
          (t.email && user.email && t.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
          (t.full_name && user.full_name && t.full_name.trim().toLowerCase() === user.full_name.trim().toLowerCase())
      );

      if (userIndex !== -1) {
        setNewTenantId(tenantsList[userIndex].id);
      } else if (tenantsList.length > 0) {
        const currentUserEntry = {
          id: user.id || "current-user",
          user_id: user.id || "current-user",
          full_name: user.full_name || user.email?.split("@")[0] || "Logged-in User",
          email: user.email || "",
          room_bed: user.role || "Logged-in Account",
        };
        tenantsList = [currentUserEntry, ...tenantsList];
        setNewTenantId(currentUserEntry.id);
      }
    }
    setTenants(tenantsList);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenAdd = () => {
    if (user && tenants.length > 0) {
      const userIndex = tenants.findIndex(
        (t) =>
          (t.id && user.id && t.id === user.id) ||
          (t.user_id && user.id && t.user_id === user.id) ||
          (t.email && user.email && t.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
          (t.full_name && user.full_name && t.full_name.trim().toLowerCase() === user.full_name.trim().toLowerCase())
      );
      if (userIndex !== -1) {
        setNewTenantId(tenants[userIndex].id);
      }
    }
    setOpenAddDialog(true);
  };

  const handleAddComplaint = async () => {
    if (!newTitle.trim()) {
      alert("Please enter a title for the complaint.");
      return;
    }

    try {
      let selectedProfileId = newTenantId;
      if (user?.role === "TENANT") {
        const matched = tenants.find(
          (t) =>
            t.user_id === user.id ||
            t.id === user.id ||
            (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase())
        );
        selectedProfileId = matched?.id || user.id || null;
      } else {
        const matched = tenants.find((t) => t.id === newTenantId);
        selectedProfileId = matched?.id || newTenantId || null;
      }

      const payload = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: "MEDIUM",
        status: "OPEN",
        tenant_profile_id: selectedProfileId,
        property_id: null,
      };

      await api.post("/complaints/", payload);
      setOpenAddDialog(false);
      setNewTitle("");
      setNewDesc("");
      setNewCategory("OTHER");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to log complaint."));
    }
  };

  const handleOpenEdit = (c) => {
    setComplaintToEdit(c);
    setEditTitle(c.title);
    setEditDesc(c.description || "");
    setEditCategory(c.category);
    setEditStatus(c.status);
    setOpenEditDialog(true);
  };

  const handleEditComplaint = async () => {
    try {
      if (complaintToEdit.status !== editStatus) {
        await api.post(`/complaints/${complaintToEdit.id}/status?new_status=${editStatus}`);
      }

      const payload = {
        title: editTitle,
        description: editDesc,
        category: editCategory,
        status: editStatus,
        priority: complaintToEdit.priority || "MEDIUM",
        images: complaintToEdit.images || [],
      };
      await api.put(`/complaints/${complaintToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to update complaint ticket."));
    }
  };

  const handleOpenView = (c) => {
    setComplaintToView(c);
    setOpenViewDialog(true);
  };

  const handleToggleComplaintStatus = async (c) => {
    const statusCycle = {
      OPEN: "IN_PROGRESS",
      IN_PROGRESS: "RESOLVED",
      RESOLVED: "CLOSED",
      CLOSED: "OPEN",
    };
    const nextStatus = statusCycle[c.status] || "OPEN";
    setComplaints((prev) => prev.map((item) => (item.id === c.id ? { ...item, status: nextStatus } : item)));
    try {
      await api.put(`/complaints/${c.id}`, { status: nextStatus });
      fetchData();
    } catch (err) {
      console.error(err);
      setComplaints((prev) => prev.map((item) => (item.id === c.id ? { ...item, status: c.status } : item)));
      alert(formatError(err, "Failed to update complaint status."));
    }
  };

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) return;
    try {
      await api.delete(`/complaints/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to delete complaint."));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split("T")[0];
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const columns = [
    {
      id: "title",
      label: "Complaint Title",
      render: (c) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => handleOpenView(c)}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          {c.title}
        </Typography>
      ),
    },
    {
      id: "category",
      label: "Category",
      render: (c) => <Chip label={c.category} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "tenant_name",
      label: "Filed By (Tenant)",
      render: (c) => (
        <Typography variant="body2" fontWeight={700} color="text.primary">
          {c.tenant_name || "Resident"}
        </Typography>
      ),
    },
    {
      id: "created_at",
      label: "Date Filed",
      render: (c) => (
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {formatDate(c.created_at)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (c) => {
        const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";
        const isInProgress = c.status === "IN_PROGRESS" || c.status === "ASSIGNED";
        return (
          <Chip
            label={c.status || "OPEN"}
            size="small"
            onClick={() => handleToggleComplaintStatus(c)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: isResolved
                ? "rgba(34, 197, 94, 0.12)"
                : isInProgress
                ? "rgba(245, 158, 11, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
              color: isResolved ? "#16A34A" : isInProgress ? "#D97706" : "#DC2626",
              "&:hover": {
                bgcolor: isResolved
                  ? "rgba(34, 197, 94, 0.22)"
                  : isInProgress
                  ? "rgba(245, 158, 11, 0.22)"
                  : "rgba(239, 68, 68, 0.22)",
              },
            }}
          />
        );
      },
    },
  ];

  const loggedInTenantDisplayName = user?.full_name || user?.email || "Ankit";

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Maintenance & Complaints
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Log, assign, and track maintenance complaints date-wise from residents.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Log Complaint
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={complaints}
        searchPlaceholder="Search complaint title, tenant, category, or date..."
        emptyMessage="No complaint tickets logged."
        actions={[
          { label: "Edit Ticket", icon: <CustomEditIcon fontSize="small" />, onClick: (c) => handleOpenEdit(c) },
          { label: "Cycle Status", icon: <CustomEyeIcon fontSize="small" />, onClick: (c) => handleToggleComplaintStatus(c) },
          { label: "Delete", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (c) => handleDeleteComplaint(c.id) },
        ]}
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Complaint Ticket</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {complaintToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="primary">
                {complaintToView.title}
              </Typography>
              <Typography variant="body2">
                <b>Category:</b> {complaintToView.category}
              </Typography>
              <Typography variant="body2">
                <b>Filed By:</b> {complaintToView.tenant_name || "Resident"}
              </Typography>
              <Typography variant="body2">
                <b>Date Filed:</b> {formatDate(complaintToView.created_at)}
              </Typography>
              <Typography variant="body2">
                <b>Status:</b> {complaintToView.status}
              </Typography>
              <Typography variant="body2">
                <b>Description:</b> {complaintToView.description || "No extra details provided."}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Log Maintenance Complaint</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Title / Summary"
            fullWidth
            variant="outlined"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="category-label">Category</InputLabel>
            <Select labelId="category-label" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} label="Category">
              <MenuItem value="PLUMBING">PLUMBING</MenuItem>
              <MenuItem value="ELECTRICAL">ELECTRICAL</MenuItem>
              <MenuItem value="APPLIANCE">APPLIANCE</MenuItem>
              <MenuItem value="CLEANING">CLEANING</MenuItem>
              <MenuItem value="SECURITY">SECURITY</MenuItem>
              <MenuItem value="OTHER">OTHER</MenuItem>
            </Select>
          </FormControl>

          {/* Render Logged In Tenant Name dynamically for TENANT role */}
          {user?.role === "TENANT" ? (
            <TextField
              margin="dense"
              label="Resident / Tenant"
              fullWidth
              variant="outlined"
              value={`${loggedInTenantDisplayName} (Logged-in Resident)`}
              disabled
              sx={{ mb: 2 }}
            />
          ) : (
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="tenant-label">Select Tenant / Resident</InputLabel>
              <Select labelId="tenant-label" value={newTenantId} onChange={(e) => setNewTenantId(e.target.value)} label="Select Tenant / Resident">
                {tenants.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.full_name || t.email} {t.room_bed ? `(${t.room_bed})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            margin="dense"
            label="Description Details"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddComplaint} variant="contained" color="primary">
            Submit Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Complaint Ticket</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            margin="dense"
            label="Title / Summary"
            fullWidth
            variant="outlined"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-category-label">Category</InputLabel>
            <Select labelId="edit-category-label" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} label="Category">
              <MenuItem value="PLUMBING">PLUMBING</MenuItem>
              <MenuItem value="ELECTRICAL">ELECTRICAL</MenuItem>
              <MenuItem value="APPLIANCE">APPLIANCE</MenuItem>
              <MenuItem value="CLEANING">CLEANING</MenuItem>
              <MenuItem value="SECURITY">SECURITY</MenuItem>
              <MenuItem value="OTHER">OTHER</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-status-label">Ticket Status</InputLabel>
            <Select labelId="edit-status-label" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} label="Ticket Status">
              <MenuItem value="OPEN">OPEN</MenuItem>
              <MenuItem value="ASSIGNED">ASSIGNED</MenuItem>
              <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
              <MenuItem value="RESOLVED">RESOLVED</MenuItem>
              <MenuItem value="CLOSED">CLOSED</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description Details"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditComplaint} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
