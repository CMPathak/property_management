import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

const TrashIcon = DeleteIcon;

const DOC_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "license", label: "Driving License" },
];

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [beds, setBeds] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState(null);

  // Add Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSecurityDeposit, setNewSecurityDeposit] = useState("");
  const [newCheckInDate, setNewCheckInDate] = useState(new Date().toISOString().split("T")[0]);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [addSelectedDocType, setAddSelectedDocType] = useState("aadhaar");
  const [addStagedDocs, setAddStagedDocs] = useState({});

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSecurityDeposit, setEditSecurityDeposit] = useState("");
  const [editCheckInDate, setEditCheckInDate] = useState("");
  const [editCheckOutDate, setEditCheckOutDate] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editSelectedDocType, setEditSelectedDocType] = useState("aadhaar");
  const [editStagedDocs, setEditStagedDocs] = useState({});

  const fetchData = async () => {
    try {
      // 1. Fetch existing tenant profile records
      let tenantProfiles = [];
      try {
        const response = await api.get("/tenants/?limit=1000");
        tenantProfiles = response.data || [];
      } catch (err) {
        console.error("Failed to load tenant profiles:", err);
      }

      // 2. Fetch users with role TENANT
      let tenantUsers = [];
      try {
        const usersRes = await api.get("/users/?limit=1000");
        tenantUsers = (usersRes.data || []).filter((u) => u.role === "TENANT");
      } catch (e) {
        try {
          const usersRes = await api.get("/users?role=TENANT&limit=1000");
          tenantUsers = usersRes.data || [];
        } catch (e2) {
          tenantUsers = [];
        }
      }

      // 3. Merge profiles and users so all TENANT role users show up
      const mergedTenants = [...tenantProfiles];
      const existingUserIds = new Set(tenantProfiles.map((tp) => tp.user_id).filter(Boolean));
      const existingEmails = new Set(tenantProfiles.map((tp) => tp.email).filter(Boolean));

      tenantUsers.forEach((u) => {
        if (!existingUserIds.has(u.id) && !existingEmails.has(u.email)) {
          mergedTenants.push({
            id: u.id,
            user_id: u.id,
            full_name: u.full_name || u.email.split("@")[0],
            email: u.email,
            phone: u.phone_number || "—",
            room_bed: "Not Allocated",
            check_in_date: "—",
            check_out_date: "—",
            security_deposit: 0,
            status: u.is_active ? "ACTIVE" : "INACTIVE",
            needs_profile: true,
          });
        }
      });

      setTenants(mergedTenants);

      // 4. Fetch vacant beds for allocation
      try {
        const propertiesRes = await api.get("/properties/");
        const propsData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
        let vacantBeds = [];
        propsData.forEach((p) => {
          if (p.floors) {
            p.floors.forEach((f) => {
              if (f.rooms) {
                f.rooms.forEach((r) => {
                  if (r.beds) {
                    r.beds.forEach((b) => {
                      if (b.status === "VACANT") {
                        vacantBeds.push({ ...b, room_number: r.room_number });
                      }
                    });
                  }
                });
              }
            });
          }
        });
        setBeds(vacantBeds);
      } catch (err) {
        console.error("Failed to fetch vacant beds:", err);
        setBeds([]);
      }
    } catch (err) {
      console.error("Failed to fetch tenant directory data:", err);
      setTenants([]);
      setBeds([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatError = (err, fallback = "Operation failed.") => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((e) => {
          const loc = e.loc ? e.loc.filter((l) => l !== "body").join(".") : "";
          return `${loc ? loc + ": " : ""}${e.msg || JSON.stringify(e)}`;
        })
        .join("\n");
    }
    if (typeof detail === "object") return JSON.stringify(detail);
    return String(detail);
  };

  const sanitizeDate = (dStr) => {
    if (!dStr || typeof dStr !== "string" || !dStr.trim() || dStr.trim() === "—") return null;
    const trimmed = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return null;
  };

  const handleUploadsForTenant = async (tenantId, stagedDocs) => {
    for (const key of Object.keys(stagedDocs)) {
      const file = stagedDocs[key];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/tenants/${tenantId}/upload-document?doc_type=${key}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    }
  };

  const handleAddTenant = async () => {
    if (!selectedBedId) {
      alert("Please select a bed to allocate.");
      return;
    }
    try {
      // Check if user already exists
      let userId = null;
      try {
        const usersRes = await api.get("/users/");
        const existing = usersRes.data.find((u) => u.email.toLowerCase() === newEmail.toLowerCase());
        if (existing) {
          userId = existing.id;
        }
      } catch (e) {}

      if (!userId) {
        const userPayload = {
          email: newEmail,
          password: "tenant_password_123",
          full_name: newName,
          phone_number: newPhone,
          role: "TENANT",
          is_active: true,
          is_verified: true,
        };
        const userRes = await api.post("/users/", userPayload);
        userId = userRes.data.id;
      }

      const tenantPayload = {
        user_id: userId,
        bed_id: selectedBedId,
        security_deposit: parseFloat(newSecurityDeposit) || 0,
        check_in_date: sanitizeDate(newCheckInDate) || new Date().toISOString().split("T")[0],
        check_out_date: sanitizeDate(newCheckOutDate),
        status: "ACTIVE",
        emergency_contact: null,
      };
      const profileRes = await api.post("/tenants/", tenantPayload);
      const tenantId = profileRes.data.id;

      await handleUploadsForTenant(tenantId, addStagedDocs);

      setOpenAddDialog(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewSecurityDeposit("");
      setNewCheckOutDate("");
      setSelectedBedId("");
      setAddStagedDocs({});
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to create tenant profile."));
    }
  };

  const handleOpenEdit = (t) => {
    setTenantToEdit(t);
    setEditName(t.full_name || "");
    setEditEmail(t.email || "");
    setEditPhone(t.phone || "");
    setSelectedBedId(t.bed_id || "");
    setEditSecurityDeposit(t.security_deposit || "");
    setEditCheckInDate(t.check_in_date || "");
    setEditCheckOutDate(t.check_out_date || "");
    setEditStatus(t.status || "ACTIVE");
    setEditStagedDocs({});
    setOpenEditDialog(true);
  };

  const handleEditTenant = async () => {
    try {
      if (tenantToEdit.needs_profile) {
        // If this user didn't have a profile in tenant_profiles, create one
        if (!selectedBedId) {
          alert("Please select a bed to allocate for this tenant.");
          return;
        }
        const tenantPayload = {
          user_id: tenantToEdit.user_id,
          bed_id: selectedBedId,
          security_deposit: parseFloat(editSecurityDeposit) || 0,
          check_in_date: sanitizeDate(editCheckInDate) || new Date().toISOString().split("T")[0],
          check_out_date: sanitizeDate(editCheckOutDate),
          status: editStatus,
          emergency_contact: null,
        };
        const profileRes = await api.post("/tenants/", tenantPayload);
        await handleUploadsForTenant(profileRes.data.id, editStagedDocs);
      } else {
        const payload = {
          bed_id: selectedBedId || null,
          security_deposit: parseFloat(editSecurityDeposit) || 0,
          check_in_date: sanitizeDate(editCheckInDate),
          check_out_date: sanitizeDate(editCheckOutDate),
          status: editStatus,
          full_name: editName,
          email: editEmail,
          phone: editPhone,
        };
        await api.put(`/tenants/${tenantToEdit.id}`, payload);

        await handleUploadsForTenant(tenantToEdit.id, editStagedDocs);
      }

      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to update tenant details."));
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tenant profile?")) return;
    try {
      await api.delete(`/tenants/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete tenant.");
    }
  };

  const handleToggleTenantStatus = async (tenant) => {
    const newStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
    try {
      if (!tenant.needs_profile) {
        await api.put(`/tenants/${tenant.id}`, { status: newStatus });
      }
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const renderFileIndicator = (label, path) => {
    if (!path) return null;
    const url = path.startsWith("http") ? path : `http://localhost:8000/${path}`;
    return (
      <Chip
        label={label}
        component="a"
        href={url}
        target="_blank"
        clickable
        size="small"
        color="primary"
        variant="outlined"
        icon={<FileIcon sx={{ fontSize: 14 }} />}
        sx={{ borderRadius: "6px" }}
      />
    );
  };

  const columns = [
    {
      id: "full_name",
      label: "Tenant Name",
      render: (t) => (
        <Box>
          <Typography variant="body2" fontWeight={700} color="text.primary">
            {t.full_name}
          </Typography>
          {t.needs_profile && (
            <Chip label="Profile Pending" size="small" color="warning" sx={{ height: 18, fontSize: "0.65rem", borderRadius: "4px" }} />
          )}
        </Box>
      ),
    },
    {
      id: "phone",
      label: "Mobile Number",
      render: (t) => (
        <Typography variant="body2" fontWeight={600}>
          {t.phone || "—"}
        </Typography>
      ),
    },
    {
      id: "email",
      label: "Email Address",
      render: (t) => (
        <Typography variant="body2" color="text.secondary">
          {t.email || "—"}
        </Typography>
      ),
    },
    {
      id: "room_bed",
      label: "Allocation",
      render: (t) => {
        const isAllocated = t.room_bed && t.room_bed !== "Not Allocated" && t.room_bed !== "Unassigned";
        return (
          <Chip
            label={isAllocated ? t.room_bed : "Not Allocated"}
            size="small"
            variant={isAllocated ? "filled" : "outlined"}
            color={isAllocated ? "primary" : "warning"}
            sx={{ borderRadius: "6px", fontWeight: 700 }}
          />
        );
      },
    },
    {
      id: "check_in_date",
      label: "Check-In",
      render: (t) => t.check_in_date || "—",
    },
    {
      id: "check_out_date",
      label: "Check-Out",
      render: (t) => t.check_out_date || "—",
    },
    {
      id: "security_deposit",
      label: "Deposit",
      render: (t) => {
        const isAllocated = t.room_bed && t.room_bed !== "Not Allocated" && t.room_bed !== "Unassigned";
        return isAllocated ? `₹${(t.security_deposit || 0).toLocaleString("en-IN")}` : "—";
      },
    },
    {
      id: "documents",
      label: "Verification Docs",
      render: (t) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {renderFileIndicator("Aadhaar", t.aadhaar_number)}
          {renderFileIndicator("PAN", t.pan_number)}
          {renderFileIndicator("Passport", t.passport_number)}
          {renderFileIndicator("License", t.driving_license)}
          {!t.aadhaar_number && !t.pan_number && !t.passport_number && !t.driving_license && (
            <Typography variant="caption" color="text.secondary">
              None
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (t) => {
        const isActive = t.status === "ACTIVE";
        return (
          <Chip
            label={isActive ? "ACTIVE" : "INACTIVE"}
            size="small"
            onClick={() => handleToggleTenantStatus(t)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: isActive ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: isActive ? "#16A34A" : "#DC2626",
              "&:hover": {
                bgcolor: isActive ? "rgba(34, 197, 94, 0.22)" : "rgba(239, 68, 68, 0.22)",
              },
            }}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Tenants Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All registered tenants, room allocations, KYC documents, check-in dates, and deposits.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Add Tenant
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={tenants}
        searchPlaceholder="Search tenant name, phone, email, or room..."
        emptyMessage="No tenants registered yet. Click 'Add Tenant' to onboard residents."
        actions={[
          { label: "Edit / Allocate", icon: <CustomEditIcon fontSize="small" />, onClick: (t) => handleOpenEdit(t) },
          { label: "Toggle Status (Active/Inactive)", icon: <CustomEyeIcon fontSize="small" />, onClick: (t) => handleToggleTenantStatus(t) },
          { label: "Delete Tenant", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (t) => handleDeleteTenant(t.id) },
        ]}
      />

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Onboard New Tenant</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, mt: 1 }}>
            <TextField label="Full Name" fullWidth value={newName} onChange={(e) => setNewName(e.target.value)} />
            <TextField label="Email Address" type="email" fullWidth value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <TextField label="Phone Number" fullWidth value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <FormControl fullWidth>
              <InputLabel id="bed-select-label">Room & Bed Allocation</InputLabel>
              <Select labelId="bed-select-label" value={selectedBedId} onChange={(e) => setSelectedBedId(e.target.value)} label="Room & Bed Allocation">
                {beds.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    Room {b.room_number} - Bed {b.bed_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Security Deposit (₹)" type="number" fullWidth value={newSecurityDeposit} onChange={(e) => setNewSecurityDeposit(e.target.value)} />
            <TextField label="Check-In Date" type="date" fullWidth value={newCheckInDate} onChange={(e) => setNewCheckInDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Check-Out Date" type="date" fullWidth value={newCheckOutDate} onChange={(e) => setNewCheckOutDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTenant} variant="contained" color="primary">
            Save Tenant
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {tenantToEdit?.needs_profile ? "Allocate Room for Tenant User" : "Edit Tenant Profile"}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, mt: 1 }}>
            <TextField label="Full Name" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
            <TextField label="Email Address" type="email" fullWidth value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={tenantToEdit?.needs_profile} />
            <TextField label="Phone Number" fullWidth value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            
            <FormControl fullWidth>
              <InputLabel id="edit-bed-select-label">Assign / Change Room & Bed</InputLabel>
              <Select labelId="edit-bed-select-label" value={selectedBedId} onChange={(e) => setSelectedBedId(e.target.value)} label="Assign / Change Room & Bed">
                <MenuItem value="">
                  <em>No Allocation (Unassigned)</em>
                </MenuItem>
                {beds.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    Room {b.room_number} - Bed {b.bed_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="edit-tenant-status-label">Status</InputLabel>
              <Select labelId="edit-tenant-status-label" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} label="Status">
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Security Deposit (₹)" type="number" fullWidth value={editSecurityDeposit} onChange={(e) => setEditSecurityDeposit(e.target.value)} />
            <TextField label="Check-In Date" type="date" fullWidth value={editCheckInDate} onChange={(e) => setEditCheckInDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Check-Out Date" type="date" fullWidth value={editCheckOutDate} onChange={(e) => setEditCheckOutDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditTenant} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
