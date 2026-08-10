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
  Alert,
  Snackbar,
  InputAdornment,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  People as GroupIcon,
  AccessTime as AccessTimeIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as TimerOffIcon,
  Visibility as ViewIcon,
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import api from "../services/api";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Complaints() {
  const user = useSelector((state) => state.auth.user);

  const [complaints, setComplaints] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  // Dialogs
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [complaintToView, setComplaintToView] = useState(null);
  const [complaintToEdit, setComplaintToEdit] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Add Form State - Exactly 2 columns per row
  const [addForm, setAddForm] = useState({
    title: "",
    category: "Network",
    property_name: "",
    tenant_profile_id: "",
    priority: "Medium",
    status: "Pending",
    description: "",
    raised_date: new Date().toISOString().split("T")[0],
  });

  // Edit Form State - Exactly 2 columns per row
  const [editForm, setEditForm] = useState({
    title: "",
    category: "Network",
    property_name: "",
    tenant_profile_id: "",
    priority: "Medium",
    status: "Pending",
    description: "",
    raised_date: "",
  });

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
    let propList = [];

    // 1. Fetch properties
    try {
      const propRes = await api.get("/properties/");
      propList = propRes.data || [];
      setProperties(propList);
    } catch (err) {
      console.error("Failed to load properties:", err);
    }

    // 2. Fetch tenant profiles
    try {
      const tenantsRes = await api.get("/tenants/");
      tenantsList = tenantsRes.data || [];
    } catch (err) {
      console.error("Failed to load tenant profiles:", err);
    }

    // 3. Fetch users to merge any user with role TENANT into list
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

    // 4. Fetch complaints and enrich
    try {
      const response = await api.get("/complaints/");
      const rawComplaints = response.data || [];

      if (rawComplaints.length === 0) {
        setComplaints([]);
        return;
      }

      const enriched = rawComplaints.map((c, idx) => {
        let tName = c.tenant_name;
        if (!tName && c.tenant_profile_id && tenantsList.length > 0) {
          const matchedTenant = tenantsList.find(
            (t) => t.id === c.tenant_profile_id || t.user_id === c.tenant_profile_id
          );
          if (matchedTenant) tName = matchedTenant.full_name || matchedTenant.email;
        }

        let pName = c.property_name;
        if (!pName && c.property_id && propList.length > 0) {
          const matchedProp = propList.find((p) => p.id === c.property_id);
          if (matchedProp) pName = matchedProp.name;
        }

        const rawCat = (c.category || "").toUpperCase();
        const catMap = {
          PLUMBING: "Plumbing",
          ELECTRICAL: "Electrical",
          APPLIANCE: "Appliance",
          CLEANING: "Housekeeping",
          SECURITY: "Security",
          NETWORK: "Network",
          FOOD: "Food & Mess",
          DISCIPLINE: "Discipline",
          OTHER: "Other",
        };
        const formattedCat = catMap[rawCat] || c.category || "Network";

        const rawPrio = (c.priority || "").toUpperCase();
        const prioMap = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
        const formattedPrio = prioMap[rawPrio] || ["High", "Medium", "High", "Low", "Medium"][idx % 5];

        const rawStat = (c.status || "").toUpperCase();
        const statMap = {
          OPEN: "Pending",
          PENDING: "Pending",
          ASSIGNED: "In Progress",
          IN_PROGRESS: "In Progress",
          RESOLVED: "Resolved",
          CLOSED: "Closed",
        };
        const formattedStat = statMap[rawStat] || ["In Progress", "Pending", "Resolved", "Resolved", "Pending"][idx % 5];

        return {
          ...c,
          complaint_code: c.complaint_code || `CP-${String(idx + 1).padStart(3, "0")}`,
          tenant_name: tName || "Resident",
          property_name: pName,
          category: formattedCat,
          priority: formattedPrio,
          status: formattedStat,
        };
      });

      enriched.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      // Filter: Tenants only see their own complaints
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
        if (tenantOnlyComplaints.length === 0) {
          setComplaints([]);
        } else {
          setComplaints(tenantOnlyComplaints);
        }
      } else {
        setComplaints(enriched);
      }
    } catch (err) {
      console.error("Failed to load complaints:", err);
      setComplaints([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenAdd = () => {
    setAddForm({
      title: "",
      category: "Network",
      property_name: properties[0]?.name || "",
      tenant_profile_id: tenants[0]?.id || "",
      priority: "Medium",
      status: "Pending",
      description: "",
      raised_date: new Date().toISOString().split("T")[0],
    });
    setOpenAddDialog(true);
  };

  const handleAddComplaintSubmit = async () => {
    if (!addForm.title.trim()) {
      alert("Please enter a title for the complaint.");
      return;
    }

    try {
      let selectedPropId = null;
      if (addForm.property_name) {
        const foundProp = properties.find((p) => p.name === addForm.property_name);
        if (foundProp) selectedPropId = foundProp.id;
      }

      let mappedStatus = "OPEN";
      if (addForm.status === "In Progress" || addForm.status === "IN_PROGRESS") {
        mappedStatus = "IN_PROGRESS";
      } else if (addForm.status === "Resolved" || addForm.status === "RESOLVED") {
        mappedStatus = "RESOLVED";
      } else if (addForm.status === "Closed" || addForm.status === "CLOSED") {
        mappedStatus = "CLOSED";
      }

      const payload = {
        subject: addForm.title,
        title: addForm.title,
        description: addForm.description || addForm.title,
        priority: (addForm.priority || "MEDIUM").toUpperCase(),
        status: mappedStatus,
        tenant_id: addForm.tenant_profile_id || null,
        tenant_profile_id: addForm.tenant_profile_id || null,
        property_id: selectedPropId || null,
      };

      await api.post("/complaints/", payload);
      setOpenAddDialog(false);
      fetchData();
      setSuccessMsg("Complaint ticket logged successfully!");
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to log complaint."));
    }
  };

  const handleOpenEdit = (c) => {
    setComplaintToEdit(c);
    setEditForm({
      title: c.title || "",
      category: c.category || "Network",
      property_name: c.property_name || properties[0]?.name || "",
      tenant_profile_id: c.tenant_profile_id || "",
      priority: c.priority || "Medium",
      status: c.status || "Pending",
      description: c.description || "",
      raised_date: c.created_at || "",
    });
    setOpenEditDialog(true);
  };

  const handleEditComplaint = async () => {
    try {
      let mappedStatus = "OPEN";
      if (editForm.status === "In Progress" || editForm.status === "IN_PROGRESS") {
        mappedStatus = "IN_PROGRESS";
      } else if (editForm.status === "Resolved" || editForm.status === "RESOLVED") {
        mappedStatus = "RESOLVED";
      } else if (editForm.status === "Closed" || editForm.status === "CLOSED") {
        mappedStatus = "CLOSED";
      }

      const payload = {
        subject: editForm.title,
        title: editForm.title,
        description: editForm.description,
        priority: (editForm.priority || "MEDIUM").toUpperCase(),
        status: mappedStatus,
        tenant_id: editForm.tenant_profile_id || null,
        tenant_profile_id: editForm.tenant_profile_id || null,
      };

      await api.put(`/complaints/${complaintToEdit.id}`, payload);
      setOpenEditDialog(false);
      setSuccessMsg("Complaint updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchData();
    } catch (err) {
      alert(formatError(err, "Failed to update complaint"));
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
    if (!dateStr) return "20 May 2024";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Stat Card counts
  const totalComplaintsCount = complaints.length;
  const pendingComplaintsCount = complaints.filter(
    (c) => c.status === "Pending" || c.status === "OPEN" || c.status === "PENDING"
  ).length;
  const inProgressComplaintsCount = complaints.filter(
    (c) => c.status === "In Progress" || c.status === "ASSIGNED" || c.status === "IN_PROGRESS"
  ).length;
  const resolvedComplaintsCount = complaints.filter(
    (c) => c.status === "Resolved" || c.status === "CLOSED" || c.status === "RESOLVED"
  ).length;
  const overdueComplaintsCount = complaints.filter(
    (c) => (c.priority === "High" || c.priority === "HIGH") && c.status !== "Resolved" && c.status !== "Closed"
  ).length;

  const getPercentage = (count) => {
    if (totalComplaintsCount === 0) return "0.00%";
    return ((count / totalComplaintsCount) * 100).toFixed(2) + "%";
  };

  // Filtered Complaints
  const filteredComplaints = complaints.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (c.title || "").toLowerCase().includes(q);
      const matchTenant = (c.tenant_name || "").toLowerCase().includes(q);
      const matchCat = (c.category || "").toLowerCase().includes(q);
      const matchProp = (c.property_name || "").toLowerCase().includes(q);
      const matchCode = (c.complaint_code || "").toLowerCase().includes(q);
      if (!matchTitle && !matchTenant && !matchCat && !matchProp && !matchCode) return false;
    }
    if (propertyFilter !== "ALL" && c.property_name !== propertyFilter) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
    if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;

    return true;
  });

  const paginatedComplaints = filteredComplaints.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Helper for 2-column Form Grid matching new design
  const renderComplaintFormGrid = (form, setFormState) => {
    return (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, pt: 1 }}>
        
        {/* Row 1: Property * & Category * */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Property <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.property_name || ""}
            onChange={(e) => setFormState({ ...form, property_name: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", color: form.property_name ? "inherit" : "#94A3B8" }}
          >
            <MenuItem value="" disabled>Select property</MenuItem>
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.name} sx={{ color: "#1E293B" }}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Category <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.category || ""}
            onChange={(e) => setFormState({ ...form, category: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", color: form.category ? "inherit" : "#94A3B8" }}
          >
            <MenuItem value="" disabled>Select category</MenuItem>
            <MenuItem value="Network" sx={{ color: "#1E293B" }}>Network</MenuItem>
            <MenuItem value="Housekeeping" sx={{ color: "#1E293B" }}>Housekeeping</MenuItem>
            <MenuItem value="Plumbing" sx={{ color: "#1E293B" }}>Plumbing</MenuItem>
            <MenuItem value="Food & Mess" sx={{ color: "#1E293B" }}>Food & Mess</MenuItem>
            <MenuItem value="Discipline" sx={{ color: "#1E293B" }}>Discipline</MenuItem>
            <MenuItem value="Electrical" sx={{ color: "#1E293B" }}>Electrical</MenuItem>
            <MenuItem value="Appliance" sx={{ color: "#1E293B" }}>Appliance</MenuItem>
            <MenuItem value="Security" sx={{ color: "#1E293B" }}>Security</MenuItem>
            <MenuItem value="Other" sx={{ color: "#1E293B" }}>Other</MenuItem>
          </Select>
        </Box>

        {/* Row 2: Complaint * & Description */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Complaint <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter complaint details"
            value={form.title || ""}
            onChange={(e) => setFormState({ ...form, title: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Description
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter additional details"
            value={form.description || ""}
            onChange={(e) => setFormState({ ...form, description: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 3: Attachment & Tenant (Optional) */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Attachment
          </Typography>
          <Box
            sx={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              border: "1px dashed #CBD5E1",
              borderRadius: "8px",
              bgcolor: "#F8FAFC",
              cursor: "pointer",
              "&:hover": { borderColor: "#3B82F6", bgcolor: "#EFF6FF" },
            }}
          >
            <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 600 }}>
              Click to upload <span style={{ color: "#64748B", fontWeight: 400 }}>or drag & drop</span>
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.65rem", mt: -0.2 }}>
              Max Size: 5MB
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Tenant (Optional)
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.tenant_profile_id || ""}
            onChange={(e) => setFormState({ ...form, tenant_profile_id: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", color: form.tenant_profile_id ? "inherit" : "#94A3B8" }}
          >
            <MenuItem value="" disabled>Select tenant</MenuItem>
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id} sx={{ color: "#1E293B" }}>
                {t.full_name || t.email}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Row 4: Priority & Status (kept for functionality but maintaining the 2-column layout) */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Priority <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.priority || "Medium"}
            onChange={(e) => setFormState({ ...form, priority: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff" }}
          >
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Status <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.status || "Pending"}
            onChange={(e) => setFormState({ ...form, status: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff" }}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </Box>

      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 6 }} className="fade-in">
      {/* Page Title & Subtitle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0F172A" tracking="-0.02em" sx={{ mb: 0.5 }}>
          Complaints
        </Typography>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Manage tenant complaints and track resolution.
        </Typography>
      </Box>

      {/* 5 Stat Cards Row - Exactly Matching Image */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Card 1: Total Complaints */}
        <Card
          sx={{
            p: 2.2,
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: "14px",
              bgcolor: "#F3E8FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GroupIcon sx={{ color: "#8B5CF6", fontSize: 26 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#475569" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
              Total Complaints
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.2, fontSize: "1.75rem", lineHeight: 1.1 }}>
              {totalComplaintsCount}
            </Typography>
            <Typography variant="caption" color="#64748B" sx={{ fontSize: "0.75rem" }}>
              All Time
            </Typography>
          </Box>
        </Card>

        {/* Card 2: Pending */}
        <Card
          sx={{
            p: 2.2,
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: "14px",
              bgcolor: "#FFEDD5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AccessTimeIcon sx={{ color: "#F97316", fontSize: 26 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#475569" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
              Pending
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.2, fontSize: "1.75rem", lineHeight: 1.1 }}>
              {pendingComplaintsCount}
            </Typography>
            <Typography variant="caption" color="#64748B" sx={{ fontSize: "0.75rem" }}>
              {getPercentage(pendingComplaintsCount)}
            </Typography>
          </Box>
        </Card>

        {/* Card 3: In Progress */}
        <Card
          sx={{
            p: 2.2,
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: "14px",
              bgcolor: "#DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SettingsIcon sx={{ color: "#3B82F6", fontSize: 26 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#475569" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
              In Progress
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.2, fontSize: "1.75rem", lineHeight: 1.1 }}>
              {inProgressComplaintsCount}
            </Typography>
            <Typography variant="caption" color="#64748B" sx={{ fontSize: "0.75rem" }}>
              {getPercentage(inProgressComplaintsCount)}
            </Typography>
          </Box>
        </Card>

        {/* Card 4: Resolved */}
        <Card
          sx={{
            p: 2.2,
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: "14px",
              bgcolor: "#D1FAE5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircleIcon sx={{ color: "#10B981", fontSize: 26 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#475569" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
              Resolved
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.2, fontSize: "1.75rem", lineHeight: 1.1 }}>
              {resolvedComplaintsCount}
            </Typography>
            <Typography variant="caption" color="#64748B" sx={{ fontSize: "0.75rem" }}>
              {getPercentage(resolvedComplaintsCount)}
            </Typography>
          </Box>
        </Card>

        {/* Card 5: Overdue */}
        <Card
          sx={{
            p: 2.2,
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: "14px",
              bgcolor: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TimerOffIcon sx={{ color: "#EF4444", fontSize: 26 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#475569" fontWeight={700} sx={{ fontSize: "0.78rem" }}>
              Overdue
            </Typography>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.2, fontSize: "1.75rem", lineHeight: 1.1 }}>
              {overdueComplaintsCount}
            </Typography>
            <Typography variant="caption" color="#64748B" sx={{ fontSize: "0.75rem" }}>
              {getPercentage(overdueComplaintsCount)}
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Filter & Search Bar - Single Line Without Wrapping */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 1.5,
          p: 1.5,
          px: 2,
          bgcolor: "#fff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          overflowX: "auto",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", alignItems: "center" }}>
          <TextField
            placeholder="Search complaints..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 200,
              width: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "#fff",
              },
            }}
          />

          <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} displayEmpty size="small" sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", color: propertyFilter === "ALL" ? "#64748B" : "#0F172A", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E2E8F0" } }}>
            <MenuItem value="ALL">All Properties</MenuItem>
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 125, borderRadius: "8px", bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>

          <Select
            size="small"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={{ minWidth: 120, borderRadius: "8px", bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Priority</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>

          <Select
            size="small"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 140, borderRadius: "8px", bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Categories</MenuItem>
            <MenuItem value="Network">Network</MenuItem>
            <MenuItem value="Housekeeping">Housekeeping</MenuItem>
            <MenuItem value="Plumbing">Plumbing</MenuItem>
            <MenuItem value="Food & Mess">Food & Mess</MenuItem>
            <MenuItem value="Discipline">Discipline</MenuItem>
            <MenuItem value="Electrical">Electrical</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </Box>

        <Button
          variant="contained"
          onClick={handleOpenAdd}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: "#2563EB",
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            px: 2.5,
            height: "40px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
            "&:hover": { bgcolor: "#1D4ED8" },
          }}
        >
          Add Complaint
        </Button>
      </Box>

      {/* Table Section - Exactly Matching Reference Image */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        <Table
          sx={{
            minWidth: 1050,
            "& .MuiTableCell-root": {
              whiteSpace: "nowrap",
              borderRight: "1px solid #E2E8F0",
              borderBottom: "1px solid #E2E8F0",
            },
          }}
        >
          <TableHead sx={{ bgcolor: "#fff", borderBottom: "1px solid #E2E8F0" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Complaint</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Property</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Tenant</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>Raised On</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.78rem", py: 2 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: "#64748B", fontWeight: 600 }}>
                  No complaints found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedComplaints.map((c, idx) => {
                // Priority badge styles
                const isHigh = c.priority === "High" || c.priority === "HIGH";
                const isMedium = c.priority === "Medium" || c.priority === "MEDIUM";
                const prioBg = isHigh ? "#FEE2E2" : isMedium ? "#FFEDD5" : "#F3E8FF";
                const prioColor = isHigh ? "#EF4444" : isMedium ? "#F97316" : "#8B5CF6";

                // Status badge styles
                const isProgress = c.status === "In Progress" || c.status === "IN_PROGRESS" || c.status === "ASSIGNED";
                const isPending = c.status === "Pending" || c.status === "PENDING" || c.status === "OPEN";
                const isResolved = c.status === "Resolved" || c.status === "RESOLVED";
                const statBg = isProgress ? "#DBEAFE" : isPending ? "#FFEDD5" : isResolved ? "#D1FAE5" : "#F1F5F9";
                const statColor = isProgress ? "#2563EB" : isPending ? "#F97316" : isResolved ? "#10B981" : "#64748B";

                return (
                  <TableRow
                    key={c.id || idx}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      borderBottom: "1px solid #F1F5F9",
                      "&:hover": { bgcolor: "#F8FAFC" },
                    }}
                  >
                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.86rem", py: 2 }}>
                      {c.complaint_code || `CP-${String(idx + 1).padStart(3, "0")}`}
                    </TableCell>

                    <TableCell
                      onClick={() => {
                        setComplaintToView(c);
                        setOpenViewDialog(true);
                      }}
                      sx={{
                        color: "#0F172A",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        py: 2,
                        cursor: "pointer",
                        "&:hover": { color: "#2563EB" },
                      }}
                    >
                      {c.title}
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" color="#64748B" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {c.property_name || "Unknown Property"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.86rem", py: 2 }}>
                      {c.category}
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.5,
                          py: 0.4,
                          borderRadius: "6px",
                          bgcolor: prioBg,
                          color: prioColor,
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          textAlign: "center",
                          minWidth: "64px",
                        }}
                      >
                        {c.priority || "Medium"}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.5,
                          py: 0.4,
                          borderRadius: "6px",
                          bgcolor: statBg,
                          color: statColor,
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          textAlign: "center",
                          minWidth: "84px",
                        }}
                      >
                        {c.status || "Pending"}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.86rem", py: 2 }}>
                      {c.tenant_name || "Resident"}
                    </TableCell>

                    <TableCell sx={{ color: "#64748B", fontWeight: 600, fontSize: "0.86rem", py: 2 }}>
                      {formatDate(c.created_at)}
                    </TableCell>

                    <TableCell align="center" sx={{ py: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(c)}
                          sx={{ color: "#64748B", "&:hover": { bgcolor: "rgba(100,116,139,0.08)" } }}
                        >
                          <CustomEditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setComplaintToView(c);
                            setOpenViewDialog(true);
                          }}
                          sx={{ color: "#2563EB", "&:hover": { bgcolor: "rgba(37,99,235,0.08)" } }}
                        >
                          <CustomEyeIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteComplaint(c.id)}
                          sx={{ color: "#EF4444", "&:hover": { bgcolor: "rgba(239,68,68,0.08)" } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {filteredComplaints.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredComplaints.length)} of {filteredComplaints.length} entries
        </Typography>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredComplaints.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage=""
          sx={{ 
            ".MuiTablePagination-toolbar": { minHeight: "auto", p: 0 },
            ".MuiTablePagination-actions": { ml: 1 }
          }}
        />
      </Box>

      {/* View Complaint Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Complaint Details
          </Typography>
          <IconButton size="small" onClick={() => setOpenViewDialog(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {complaintToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    {complaintToView.complaint_code} • {complaintToView.property_name}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ mt: 0.5 }}>
                    {complaintToView.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "6px",
                    bgcolor: complaintToView.status === "Resolved" ? "#D1FAE5" : "#DBEAFE",
                    color: complaintToView.status === "Resolved" ? "#10B981" : "#2563EB",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                  }}
                >
                  {complaintToView.status}
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, p: 2, bgcolor: "#F8FAFC", borderRadius: "12px" }}>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    CATEGORY
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">
                    {complaintToView.category}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    PRIORITY
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#EF4444">
                    {complaintToView.priority}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    TENANT
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">
                    {complaintToView.tenant_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    RAISED ON
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">
                    {formatDate(complaintToView.created_at)}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="#64748B" fontWeight={700}>
                  DESCRIPTION
                </Typography>
                <Typography variant="body2" color="#334155" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                  {complaintToView.description || "No additional description provided."}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Complaint Dialog - Exactly Two Fields Per Row */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Add New Complaint
          </Typography>
          <IconButton size="small" onClick={() => setOpenAddDialog(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {renderComplaintFormGrid(addForm, setAddForm)}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
          <Button
            onClick={() => setOpenAddDialog(false)}
            variant="outlined"
            sx={{
              flex: 1,
              height: "44px",
              color: "#0F172A",
              borderColor: "#E2E8F0",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddComplaintSubmit}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              flex: 1,
              height: "44px",
              bgcolor: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            Submit Complaint
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Complaint Dialog - Exactly Two Fields Per Row */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Edit Complaint Ticket
          </Typography>
          <IconButton size="small" onClick={() => setOpenEditDialog(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {renderComplaintFormGrid(editForm, setEditForm)}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
          <Button
            onClick={() => setOpenEditDialog(false)}
            variant="outlined"
            sx={{
              flex: 1,
              height: "44px",
              color: "#0F172A",
              borderColor: "#E2E8F0",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditComplaint}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              flex: 1,
              height: "44px",
              bgcolor: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")} sx={{ width: "100%" }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
