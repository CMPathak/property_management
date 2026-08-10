import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  InputAdornment,
  Grid,
  TablePagination,
  Tooltip,
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  VisibilityOutlined as ViewIcon,
  MoreVert as MoreIcon,
  Business as BusinessIcon,
  MapsHomeWork as RoomIcon,
  KingBed as BedIcon,
  Hotel as OccupiedIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  NoteAdd as SaveIcon,
} from "@mui/icons-material";
import api from "../services/api";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

const CustomLabel = ({ children, required }) => (
  <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>
    {children} {required && <span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span>}
  </Typography>
);

const CustomTextField = (props) => (
  <TextField
    fullWidth
    variant="outlined"
    {...props}
    sx={{
      "& .MuiOutlinedInput-root": {
        borderRadius: "8px",
        bgcolor: "#fff",
        "& fieldset": { borderColor: "#CBD5E1" },
        "&:hover fieldset": { borderColor: "#94A3B8" },
        "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "1px" },
        "& input::placeholder": { color: "#94A3B8", opacity: 1 },
        "& textarea::placeholder": { color: "#94A3B8", opacity: 1 },
      },
      "& .MuiOutlinedInput-input": {
        padding: "10px 14px",
      },
      ...props.sx
    }}
  />
);

const CustomSelect = (props) => (
  <FormControl fullWidth>
    <Select
      {...props}
      fullWidth
      displayEmpty
      sx={{
        borderRadius: "8px",
        bgcolor: "#fff",
        width: "100%",
        "& fieldset": { borderColor: "#CBD5E1" },
        "&:hover fieldset": { borderColor: "#94A3B8" },
        "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "1px" },
        "& .MuiSelect-select": { padding: "10px 14px" },
        ...props.sx
      }}
    />
  </FormControl>
);

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  
  const [propertyToEdit, setPropertyToEdit] = useState(null);
  const [propertyToView, setPropertyToView] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pin_code: "",
    phone: "",
    email: "",
    property_type: "",
    total_floors: "1",
    description: "",
    status: "ACTIVE"
  });

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pin_code: "",
      phone: "",
      email: "",
      property_type: "",
      total_floors: "1",
      description: "",
      status: "ACTIVE"
    });
  };

  const fetchData = async () => {
    try {
      const response = await api.get("/properties/");
      setProperties(response.data);
    } catch (err) {
      console.error("Failed to load properties details:", err);
      setProperties([]);
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

  const handleDeleteProperty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      await api.delete(`/properties/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleAddProperty = async () => {
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.state || !formData.country || !formData.pin_code || !formData.phone || !formData.property_type) {
      alert("Please fill in all required fields including Property Type.");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pin_code: formData.pin_code,
        phone: formData.phone,
        email: formData.email,
        property_type: formData.property_type,
        status: formData.status,
      };

      const response = await api.post("/properties/", payload);
      const createdPropertyId = response.data.id;

      const totalFloorsCount = parseInt(formData.total_floors) || 0;
      for (let i = 1; i <= totalFloorsCount; i++) {
        try {
          await api.post("/floors/", {
            floor_number: i,
            property_id: createdPropertyId,
          });
        } catch (e) {
          console.error(`Failed to auto-create floor ${i}:`, e);
        }
      }

      setOpenAddDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (p) => {
    setPropertyToEdit(p);
    setFormData({
      name: p.name || "",
      code: p.code || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      country: p.country || "",
      pin_code: p.pin_code || "",
      phone: p.phone || "",
      email: p.email || "",
      property_type: p.property_type || "",
      total_floors: p.floors ? p.floors.length.toString() : "0",
      description: p.description || "",
      status: p.status || "ACTIVE"
    });
    setOpenEditDialog(true);
  };

  const handleEditProperty = async () => {
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.state || !formData.country || !formData.pin_code || !formData.phone || !formData.property_type) {
      alert("Please fill in all required fields including Property Type.");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pin_code: formData.pin_code,
        phone: formData.phone,
        email: formData.email,
        property_type: formData.property_type,
        status: formData.status,
      };

      await api.put(`/properties/${propertyToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      alert(formatError(err));
    }
  };

  const handleOpenView = (p) => {
    setPropertyToView(p);
    setOpenViewDialog(true);
  };

  const handleTogglePropertyStatus = async (p) => {
    const nextStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/properties/${p.id}`, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert(formatError(err));
    }
  };

  const stats = useMemo(() => {
    let totalRooms = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;

    properties.forEach(p => {
      if (p.floors) {
        p.floors.forEach(f => {
          if (f.rooms) {
            totalRooms += f.rooms.length;
            f.rooms.forEach(r => {
              if (r.beds) {
                totalBeds += r.beds.length;
                occupiedBeds += r.beds.filter(b => b.status === "OCCUPIED").length;
              }
            });
          }
        });
      }
    });

    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0.00";
    return { totalRooms, totalBeds, occupiedBeds, occupancyRate };
  }, [properties]);

  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderFormFields = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.5 }}>
      <Box>
        <CustomLabel required>Property Name</CustomLabel>
        <CustomTextField placeholder="Enter property name" value={formData.name} onChange={(e) => handleFormChange("name", e.target.value)} />
      </Box>
      <Box>
        <CustomLabel required>Property Code</CustomLabel>
        <CustomTextField placeholder="Enter unique property code" value={formData.code} onChange={(e) => handleFormChange("code", e.target.value)} />
      </Box>
      <Box>
        <CustomLabel required>Address</CustomLabel>
        <CustomTextField placeholder="Enter full address" value={formData.address} onChange={(e) => handleFormChange("address", e.target.value)} />
      </Box>

      <Box>
        <CustomLabel required>City</CustomLabel>
        <CustomTextField placeholder="Enter city" value={formData.city} onChange={(e) => handleFormChange("city", e.target.value)} />
      </Box>
      <Box>
        <CustomLabel required>State</CustomLabel>
        <CustomSelect value={formData.state || ""} onChange={(e) => handleFormChange("state", e.target.value)}>
          <MenuItem value="" disabled><span style={{color: "#94A3B8"}}>Select state</span></MenuItem>
          {INDIAN_STATES.map((state) => (
            <MenuItem key={state} value={state}>{state}</MenuItem>
          ))}
        </CustomSelect>
      </Box>
      <Box>
        <CustomLabel required>Country</CustomLabel>
        <CustomSelect value={formData.country || ""} onChange={(e) => handleFormChange("country", e.target.value)}>
          <MenuItem value="" disabled><span style={{color: "#94A3B8"}}>Select country</span></MenuItem>
          <MenuItem value="India">India</MenuItem>
        </CustomSelect>
      </Box>

      <Box>
        <CustomLabel required>Pincode</CustomLabel>
        <CustomTextField placeholder="Enter pincode" value={formData.pin_code} onChange={(e) => handleFormChange("pin_code", e.target.value)} />
      </Box>
      <Box>
        <CustomLabel required>Contact Number</CustomLabel>
        <CustomTextField placeholder="Enter contact number" value={formData.phone} onChange={(e) => handleFormChange("phone", e.target.value)} />
      </Box>
      <Box>
        <CustomLabel>Email</CustomLabel>
        <CustomTextField placeholder="Enter email address" value={formData.email} onChange={(e) => handleFormChange("email", e.target.value)} />
      </Box>

      <Box>
        <CustomLabel required>Property Type</CustomLabel>
        <CustomSelect value={formData.property_type || ""} onChange={(e) => handleFormChange("property_type", e.target.value)}>
          <MenuItem value="" disabled><span style={{color: "#94A3B8"}}>Select property type</span></MenuItem>
          <MenuItem value="Hostel">Hostel</MenuItem>
          <MenuItem value="PG">PG</MenuItem>
          <MenuItem value="Apartment">Apartment</MenuItem>
        </CustomSelect>
      </Box>
      <Box>
        <CustomLabel required>Status</CustomLabel>
        <CustomSelect value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)}>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INACTIVE">Inactive</MenuItem>
        </CustomSelect>
      </Box>

      <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
        <CustomLabel>Description</CustomLabel>
        <CustomTextField placeholder="Enter description (optional)" multiline rows={2} value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, bgcolor: "#FAFBFC", minHeight: "100vh" }}>
      
      {/* Header Area */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
          Home &gt; <span style={{ color: "#0F172A", fontWeight: 600 }}>Properties</span>
        </Typography>
        
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
              Properties
            </Typography>
            <Typography variant="body2" color="#64748B">
              Manage all your properties in one place
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              placeholder="Search properties..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: "#fff", borderRadius: "8px", width: "240px", "& fieldset": { borderColor: "#E2E8F0" } }
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { resetForm(); setOpenAddDialog(true); }}
              sx={{ bgcolor: "#2563EB", textTransform: "none", borderRadius: "8px", px: 3, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}
            >
              Add Property
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3, mb: 4 }}>
        <Box sx={{ bgcolor: "#fff", p: 3, borderRadius: "12px", border: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B82F6" }}>
            <BusinessIcon />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600} color="#64748B">Total Properties</Typography>
            <Typography variant="h5" fontWeight={800} color="#0F172A">{properties.length}</Typography>
            <Typography variant="caption" color="#64748B">All time</Typography>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "#fff", p: 3, borderRadius: "12px", border: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
            <RoomIcon />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600} color="#64748B">Total Rooms</Typography>
            <Typography variant="h5" fontWeight={800} color="#0F172A">{stats.totalRooms}</Typography>
            <Typography variant="caption" color="#64748B">Across all properties</Typography>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "#fff", p: 3, borderRadius: "12px", border: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6" }}>
            <BedIcon />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600} color="#64748B">Total Beds</Typography>
            <Typography variant="h5" fontWeight={800} color="#0F172A">{stats.totalBeds}</Typography>
            <Typography variant="caption" color="#64748B">Across all properties</Typography>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "#fff", p: 3, borderRadius: "12px", border: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", color: "#F97316" }}>
            <OccupiedIcon />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600} color="#64748B">Occupied Beds</Typography>
            <Typography variant="h5" fontWeight={800} color="#0F172A">{stats.occupiedBeds}</Typography>
            <Typography variant="caption" color="#64748B">{stats.occupancyRate}% Occupied</Typography>
          </Box>
        </Box>
      </Box>

      {/* Data Table */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>PROPERTY NAME</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>CODE</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>TYPE</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>ADDRESS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>TOTAL FLOORS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>TOTAL ROOMS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>TOTAL BEDS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>OCCUPIED BEDS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>STATUS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", whiteSpace: "nowrap" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "48px 24px", textAlign: "center", color: "#64748B" }}>
                  No properties found matching your search.
                </td>
              </tr>
            ) : (
              filteredProperties.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p, idx) => {
                let pRooms = 0;
                let pBeds = 0;
                let pOccBeds = 0;
                if (p.floors) {
                  p.floors.forEach(f => {
                    if (f.rooms) {
                      pRooms += f.rooms.length;
                      f.rooms.forEach(r => {
                        if (r.beds) {
                          pBeds += r.beds.length;
                          pOccBeds += r.beds.filter(b => b.status === "OCCUPIED").length;
                        }
                      });
                    }
                  });
                }
                const pOccRate = pBeds > 0 ? ((pOccBeds / pBeds) * 100).toFixed(2) : "0";
                const imageUrl = p.images && p.images.length > 0 ? (p.images[0].startsWith("http") ? p.images[0] : `http://localhost:8000/${p.images[0]}`) : "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=100&q=80";

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px", whiteSpace: "nowrap" }}>
                      <Avatar src={imageUrl} variant="rounded" sx={{ width: 44, height: 44, borderRadius: "8px" }} />
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {p.name}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {p.code || `PRP-00${idx + 1}`}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Chip label={p.property_type || "N/A"} size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", fontWeight: 600, borderRadius: "6px" }} />
                    </td>
                    <td style={{ padding: "16px 24px", maxWidth: "300px", minWidth: "250px" }}>
                      <Tooltip title={p.address || ""} placement="top" arrow>
                        <Typography variant="body2" color="#475569" sx={{ display: "-webkit-box", overflow: "hidden", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, cursor: "default" }}>
                          {p.address}
                        </Typography>
                      </Tooltip>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">{p.floors?.length || 0}</Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">{pRooms}</Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">{pBeds}</Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {pOccBeds} <span style={{ color: "#64748B", fontWeight: 500 }}>({pOccRate}%)</span>
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      {p.status === "ACTIVE" ? (
                        <Chip label="Active" size="small" onClick={() => handleTogglePropertyStatus(p)} sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", cursor: "pointer" }} />
                      ) : (
                        <Chip label="Inactive" size="small" onClick={() => handleTogglePropertyStatus(p)} sx={{ bgcolor: "#FEE2E2", color: "#991B1B", fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", cursor: "pointer" }} />
                      )}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => handleOpenEdit(p)} sx={{ color: "#2563EB" }}>
                        <CustomEditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenView(p)} sx={{ color: "#2563EB" }}>
                        <CustomEyeIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteProperty(p.id)} sx={{ color: "#EF4444" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
          Showing {filteredProperties.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredProperties.length)} of {filteredProperties.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredProperties.length}
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

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Add New Property
          </Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>
            Cancel
          </Button>
          <Button onClick={handleAddProperty} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}>
            Save Property
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Edit Property
          </Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>
            Cancel
          </Button>
          <Button onClick={handleEditProperty} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Property Overview
          </Typography>
          <IconButton onClick={() => setOpenViewDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {propertyToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="#2563EB">
                {propertyToView.name}
              </Typography>
              <Typography variant="body2">
                <b>Code:</b> {propertyToView.code || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Address:</b> {propertyToView.address}
              </Typography>
              <Typography variant="body2">
                <b>City:</b> {propertyToView.city || "—"}
              </Typography>
              <Typography variant="body2">
                <b>State:</b> {propertyToView.state || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Country:</b> {propertyToView.country || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Pincode:</b> {propertyToView.pin_code || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Phone:</b> {propertyToView.phone || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Email:</b> {propertyToView.email || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Property Type:</b> {propertyToView.property_type || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Status:</b> {propertyToView.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
