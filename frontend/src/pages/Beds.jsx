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
  Card,
  InputAdornment,
  IconButton,
  TablePagination,
  Tooltip,
  Snackbar
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Bed as BedIcon,
  Person as PersonIcon,
  Build as ToolsIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  VisibilityOff as VisibilityOffIcon
} from "@mui/icons-material";
import api from "../services/api";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Beds() {
  const user = useSelector((state) => state.auth.user);
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [floors, setFloors] = useState([]);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [bedToEdit, setBedToEdit] = useState(null);
  const [bedToView, setBedToView] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    property_id: "",
    floor_id: "",
    room_id: "",
    bed_number: "",
    bed_type: "",
    monthly_rent: "",
    status: "VACANT",
    description: "",
  });

  // Filter State
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchData = async () => {
    try {
      const [propertiesRes, tenantsRes] = await Promise.all([
        api.get("/properties/"),
        api.get("/tenants/")
      ]);
      const tenants = tenantsRes.data || [];

      let allRooms = [];
      let allBeds = [];
      let allProperties = (propertiesRes.data || []).filter(p => p.status === "ACTIVE");
      let allFloors = [];

      allProperties.forEach((p) => {
        if (p.floors) {
          p.floors.forEach((f) => {
            allFloors.push(f);
            if (f.rooms) {
              f.rooms.forEach((r) => {
                allRooms.push({ ...r, property_id: p.id, property_name: p.name });
                if (r.beds) {
                  r.beds.forEach((b) => {
                    // Find assigned tenant
                    const assignedTenant = tenants.find(t => t.bed_id === b.id && t.status !== "INACTIVE");

                    allBeds.push({
                      ...b,
                      room_number: r.room_number,
                      room_id: r.id,
                      base_rent: r.monthly_rent || r.base_rent,
                      room_type: r.room_type,
                      floor_number: f.floor_number,
                      floor_id: f.id,
                      property_name: p.name,
                      property_id: p.id,
                      tenant_name: assignedTenant ? assignedTenant.full_name : null,
                      tenant_id: assignedTenant ? assignedTenant.tenant_code : null
                    });
                  });
                }
              });
            }
          });
        }
      });

      setProperties(allProperties);
      setFloors(allFloors);
      setRooms(allRooms);
      setBeds(allBeds);
    } catch (err) {
      console.error("Failed to load beds:", err);
      setProperties([]);
      setFloors([]);
      setRooms([]);
      setBeds([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || "Failed to process request.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join(".") || "Field"}: ${e.msg}`).join("\n");
    }
    return JSON.stringify(detail);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "property_id") { next.floor_id = ""; next.room_id = ""; }
      if (field === "floor_id") { next.room_id = ""; }
      return next;
    });
  };

  const handleOpenAdd = () => {
    setFormData({
      property_id: propertyFilter !== "ALL" ? propertyFilter : "",
      floor_id: floorFilter !== "ALL" ? floorFilter : "",
      room_id: roomFilter !== "ALL" ? roomFilter : "",
      bed_number: "",
      bed_type: "",
      monthly_rent: "",
      status: "VACANT",
      description: "",
    });
    setOpenAddDialog(true);
  };

  const handleAddBed = async () => {
    if (!formData.room_id) {
      alert("Please select a room.");
      return;
    }
    try {
      const payload = {
        bed_number: formData.bed_number,
        status: "VACANT",
        room_id: formData.room_id,
        bed_type: formData.bed_type ? formData.bed_type.toUpperCase() : null,
      };
      await api.post("/beds/", payload);
      setOpenAddDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (b) => {
    setBedToEdit(b);
    let initialBedType = "";
    if (b.bed_type) {
      initialBedType = b.bed_type.charAt(0).toUpperCase() + b.bed_type.slice(1).toLowerCase();
    } else if (b.room_type) {
      initialBedType = b.room_type.charAt(0).toUpperCase() + b.room_type.slice(1).toLowerCase();
    }
    setFormData({
      property_id: b.property_id || "",
      floor_id: b.floor_id || "",
      room_id: b.room_id || "",
      bed_number: b.bed_number || "",
      bed_type: initialBedType,
      monthly_rent: b.base_rent || "",
      status: b.status || "VACANT",
      description: b.description || "",
    });
    setOpenEditDialog(true);
  };

  const handleEditBed = async () => {
    try {
      const payload = {
        bed_number: formData.bed_number,
        status: formData.status,
        bed_type: formData.bed_type ? formData.bed_type.toUpperCase() : null,
      };
      await api.put(`/beds/${bedToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenView = (b) => {
    setBedToView(b);
    setOpenViewDialog(true);
  };

  const handleToggleBedStatus = async (bed) => {
    const newStatus = bed.status === "MAINTENANCE"
      ? (bed.tenant_name ? "OCCUPIED" : "VACANT")
      : "MAINTENANCE";
    setBeds((prev) => prev.map((b) => (b.id === bed.id ? { ...b, status: newStatus } : b)));
    try {
      const payload = {
        bed_number: bed.bed_number,
        bed_type: bed.bed_type ? bed.bed_type.toUpperCase() : null,
        status: newStatus
      };
      await api.put(`/beds/${bed.id}`, payload);
      fetchData();
    } catch (err) {
      console.error(err);
      setBeds((prev) => prev.map((b) => (b.id === bed.id ? { ...b, status: bed.status } : b)));
      alert(formatError(err));
    }
  };

  const handleDeleteBed = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bed?")) return;
    try {
      await api.delete(`/beds/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  // Stats
  const totalBeds = beds.length;
  const availableBeds = beds.filter(b => b.status === "VACANT" || !b.status).length;
  const occupiedBeds = beds.filter(b => b.status === "OCCUPIED").length;
  const maintenanceBeds = beds.filter(b => b.status === "MAINTENANCE").length;

  const availablePerc = totalBeds ? ((availableBeds / totalBeds) * 100).toFixed(2) : "0.00";
  const occupiedPerc = totalBeds ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0.00";
  const maintenancePerc = totalBeds ? ((maintenanceBeds / totalBeds) * 100).toFixed(2) : "0.00";

  const filteredBeds = beds.filter((b) => {
    const matchesSearch = String(b.bed_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.tenant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.property_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProperty = propertyFilter === "ALL" || b.property_id === propertyFilter;
    const matchesFloor = floorFilter === "ALL" || b.floor_id === floorFilter;
    const matchesRoom = roomFilter === "ALL" || b.room_id === roomFilter;

    let matchesStatus = true;
    if (statusFilter === "AVAILABLE") matchesStatus = b.status === "VACANT" || !b.status;
    if (statusFilter === "OCCUPIED") matchesStatus = b.status === "OCCUPIED";
    if (statusFilter === "MAINTENANCE") matchesStatus = b.status === "MAINTENANCE";

    return matchesSearch && matchesProperty && matchesFloor && matchesRoom && matchesStatus;
  });

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, bgcolor: "#FAFBFC", minHeight: "100vh" }} className="fade-in">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
          Beds Management
        </Typography>
      </Box>



      {/* Filter Bar */}
      <Box sx={{ display: "flex", flexWrap: "nowrap", justifyContent: "space-between", alignItems: "center", gap: 1.5, mb: 3, p: 1.5, px: 2, bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>

        {/* Left Side: Filters & Search */}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", alignItems: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: "130px" }}>
            <Select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setFloorFilter("ALL"); setRoomFilter("ALL"); }} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}>
              <MenuItem value="ALL">All Properties</MenuItem>
              {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: "110px" }}>
            <Select value={floorFilter} onChange={(e) => { setFloorFilter(e.target.value); setRoomFilter("ALL"); }} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}>
              <MenuItem value="ALL">All Floors</MenuItem>
              {floors.filter(f => propertyFilter === "ALL" || f.property_id === propertyFilter).map(f => <MenuItem key={f.id} value={f.id}>Floor {f.floor_number}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: "110px" }}>
            <Select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}>
              <MenuItem value="ALL">All Rooms</MenuItem>
              {rooms.filter(r => (propertyFilter === "ALL" || r.property_id === propertyFilter) && (floorFilter === "ALL" || r.floor_id === floorFilter)).map(r => <MenuItem key={r.id} value={r.id}>{r.room_number}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: "110px" }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}>
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="OCCUPIED">Occupied</MenuItem>
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search beds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} /></InputAdornment>, sx: { bgcolor: "#FAFBFC", borderRadius: "8px", width: "160px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" } } }}
          />
        </Box>

        {/* Right Side: Add Button */}
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ height: "40px", flexShrink: 0, bgcolor: "#2563EB", textTransform: "none", borderRadius: "8px", px: 2.5, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}>
          Add Bed
        </Button>
      </Box>

      {/* Data Table */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>BED NO.</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>PROPERTY</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>FLOOR</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>ROOM</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>BED TYPE</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>STATUS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>ALLOCATED TO</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>RENT (₹)</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredBeds.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                  No beds found matching filters.
                </td>
              </tr>
            ) : (
              filteredBeds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((b, idx) => {
                // Bed Type Chip Styles
                const currentBedType = b.bed_type ? b.bed_type.toLowerCase() : (b.room_type ? b.room_type.toLowerCase() : "single");
                let typeColor = "#3B82F6";
                let typeBg = "#EFF6FF";
                if (currentBedType === "single") { typeColor = "#16A34A"; typeBg = "#DCFCE7"; }
                else if (currentBedType === "double") { typeColor = "#9333EA"; typeBg = "#F3E8FF"; }
                else if (currentBedType === "triple") { typeColor = "#D97706"; typeBg = "#FEF3C7"; }
                else if (currentBedType === "bunk") { typeColor = "#F59E0B"; typeBg = "#FEF3C7"; }

                // Status Styles
                let statColor = "#16A34A";
                let statBg = "#DCFCE7";
                let statText = "Available";
                if (b.status === "OCCUPIED") { statColor = "#DC2626"; statBg = "#FEE2E2"; statText = "Occupied"; }
                else if (b.status === "MAINTENANCE") { statColor = "#9333EA"; statBg = "#F3E8FF"; statText = "Maintenance"; }

                return (
                  <tr key={b.id} onClick={() => handleOpenView(b)} style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer", "&:hover": { backgroundColor: "#F8FAFC" } }}>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {b.bed_number}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {b.property_name || "—"}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {b.floor_number ? (b.floor_number === 0 ? "Ground Floor" : b.floor_number === 1 ? "First Floor" : b.floor_number === 2 ? "Second Floor" : b.floor_number === 3 ? "Third Floor" : `Floor ${b.floor_number}`) : "—"}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {b.room_number || "—"}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Chip label={b.bed_type ? b.bed_type : (b.room_type || "Single")} size="small" sx={{ bgcolor: typeBg, color: typeColor, fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", textTransform: "capitalize" }} />
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Chip label={statText} size="small" sx={{ bgcolor: statBg, color: statColor, fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem" }} />
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      {b.tenant_name ? (
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#0F172A">{b.tenant_name}</Typography>
                          <Typography variant="caption" fontWeight={600} color="#94A3B8">{b.tenant_id || `TNT-${1000 + idx}`}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" fontWeight={700} color="#475569">-</Typography>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {(b.base_rent || 0).toLocaleString("en-IN")}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(b); }} sx={{ color: "#0EA5E9" }}>
                          <CustomEditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Tooltip title={b.status === "MAINTENANCE" ? "Mark Vacant" : "Mark Maintenance"}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleBedStatus(b); }} sx={{ color: b.status !== "MAINTENANCE" ? "#3B82F6" : "#94A3B8" }}>
                            {b.status !== "MAINTENANCE" ? <CustomEyeIcon sx={{ fontSize: 20 }} /> : <VisibilityOffIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteBed(b.id); }} sx={{ color: "#EF4444" }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Box>

      {/* Pagination Details matching mockup */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {filteredBeds.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredBeds.length)} of {filteredBeds.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredBeds.length}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage=""
          sx={{
            ".MuiTablePagination-toolbar": { minHeight: "auto", p: 0 },
            ".MuiTablePagination-actions": { ml: 1 }
          }}
        />
      </Box>

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Bed Details</Typography>
          <IconButton onClick={() => setOpenViewDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {bedToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Header section */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", bgcolor: "#FAFBFC", p: 2, borderRadius: "12px", border: "1px solid #F1F5F9" }}>
                <Box>
                  <Typography variant="h5" fontWeight={800} color="#0F172A">Bed {bedToView.bed_number}</Typography>
                  <Typography variant="body2" color="#64748B" sx={{ mt: 0.5 }}>{bedToView.property_name} • Floor {bedToView.floor_number} • Room {bedToView.room_number}</Typography>
                </Box>
                <Chip label={bedToView.status === "OCCUPIED" ? "Occupied" : (bedToView.status === "MAINTENANCE" ? "Maintenance" : "Available")} size="small" sx={{ fontWeight: 700, borderRadius: "6px" }} color={bedToView.status === "OCCUPIED" ? "error" : (bedToView.status === "MAINTENANCE" ? "warning" : "success")} />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Tenant</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>{bedToView.tenant_name || "Unassigned"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Rent</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>₹ {(bedToView.base_rent || 0).toLocaleString("en-IN")}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Room Type</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5, textTransform: "capitalize" }}>{bedToView.room_type || "Single"}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Add New Bed</Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Property <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.property_id} onChange={(e) => handleFormChange("property_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose property</span></MenuItem>
                {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={!formData.property_id}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Floor <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.floor_id} onChange={(e) => handleFormChange("floor_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose floor</span></MenuItem>
                {floors.filter(f => f.property_id === formData.property_id).map(f => <MenuItem key={f.id} value={f.id}>Floor {f.floor_number}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={!formData.floor_id}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Room <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.room_id} onChange={(e) => handleFormChange("room_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose room</span></MenuItem>
                {rooms.filter(r => r.floor_id === formData.floor_id).map(r => <MenuItem key={r.id} value={r.id}>Room {r.room_number}</MenuItem>)}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Bed Number / Code <span style={{ color: "#EF4444" }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="e.g. B-101-A" value={formData.bed_number} onChange={(e) => handleFormChange("bed_number", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>

            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Bed Type <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.bed_type} onChange={(e) => handleFormChange("bed_type", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Select bed type</span></MenuItem>
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Double">Double</MenuItem>
                <MenuItem value="Bunk">Bunk</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Monthly Rent (₹) <span style={{ color: "#EF4444" }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="Enter monthly rent" type="number" value={formData.monthly_rent} onChange={(e) => handleFormChange("monthly_rent", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>

            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="VACANT">Vacant</MenuItem>
                <MenuItem value="OCCUPIED">Occupied</MenuItem>
                <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ gridColumn: { xs: "1", sm: "span 2" } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Description (Optional)</Typography>
              <TextField fullWidth multiline rows={3} placeholder="Enter description" value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleAddBed} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Bed</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Edit Bed</Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Property <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.property_id} onChange={(e) => handleFormChange("property_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose property</span></MenuItem>
                {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={!formData.property_id}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Floor <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.floor_id} onChange={(e) => handleFormChange("floor_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose floor</span></MenuItem>
                {floors.filter(f => f.property_id === formData.property_id).map(f => <MenuItem key={f.id} value={f.id}>Floor {f.floor_number}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={!formData.floor_id}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Room <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.room_id} onChange={(e) => handleFormChange("room_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose room</span></MenuItem>
                {rooms.filter(r => r.floor_id === formData.floor_id).map(r => <MenuItem key={r.id} value={r.id}>Room {r.room_number}</MenuItem>)}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Bed Number / Code <span style={{ color: "#EF4444" }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="e.g. B-101-A" value={formData.bed_number} onChange={(e) => handleFormChange("bed_number", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>

            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Bed Type <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.bed_type} onChange={(e) => handleFormChange("bed_type", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Select bed type</span></MenuItem>
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Double">Double</MenuItem>
                <MenuItem value="Bunk">Bunk</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Monthly Rent (₹) <span style={{ color: "#EF4444" }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="Enter monthly rent" type="number" value={formData.monthly_rent} onChange={(e) => handleFormChange("monthly_rent", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>

            <FormControl fullWidth size="small">
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
              <Select value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
                <MenuItem value="VACANT">Vacant</MenuItem>
                <MenuItem value="OCCUPIED">Occupied</MenuItem>
                <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ gridColumn: { xs: "1", sm: "span 2" } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Description (Optional)</Typography>
              <TextField fullWidth multiline rows={3} placeholder="Enter description" value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleEditBed} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
