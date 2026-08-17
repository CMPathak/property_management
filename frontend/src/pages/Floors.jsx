import React, { useState, useEffect } from "react";
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
  InputAdornment,
  Chip,
  IconButton,
  TablePagination
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import api from "../services/api";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Floors() {
  const [floors, setFloors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [floorToEdit, setFloorToEdit] = useState(null);

  const [propertyFilter, setPropertyFilter] = useState("ALL");

  // Unified Form State
  const [formData, setFormData] = useState({
    property_id: "",
    floor_number: "",
    floor_name: "",
    floor_type: "",
    description: "",
    status: "ACTIVE"
  });

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      property_id: propertyFilter !== "ALL" ? propertyFilter : "",
      floor_number: "",
      floor_name: "",
      floor_type: "",
      description: "",
      status: "ACTIVE"
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpenAddDialog(true);
  };

  const fetchData = async () => {
    try {
      const propsRes = await api.get("/properties/");
      const fetchedProps = Array.isArray(propsRes.data) ? propsRes.data : [];
      const propsData = fetchedProps.filter(p => p.status === "ACTIVE");
      setProperties(propsData);

      let floorsList = [];
      propsData.forEach((p) => {
        if (p.floors && Array.isArray(p.floors)) {
          p.floors.forEach((f) => {
            const roomCount = f.rooms ? f.rooms.length : 0;
            floorsList.push({
              ...f,
              property_name: p.name,
              room_count: roomCount,
            });
          });
        }
      });
      setFloors(floorsList);
    } catch (err) {
      console.error("Failed to fetch floors data:", err);
      setFloors([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteFloor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this floor?")) return;
    try {
      await api.delete(`/floors/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete floor.");
    }
  };

  const handleToggleFloorStatus = async (floor) => {
    try {
      const newStatus = floor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.put(`/floors/${floor.id}`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert("Failed to update floor status");
    }
  };

  const handleAddFloor = async () => {
    if (!formData.property_id || !formData.floor_number) {
      alert("Please fill all required fields.");
      return;
    }
    try {
      await api.post("/floors/", {
        property_id: formData.property_id,
        // If backend still expects integer, parseInt might strip chars.
        // We will send it as-is and let backend handle parsing/validation.
        floor_number: formData.floor_number,
        floor_name: formData.floor_name || null,
        floor_type: formData.floor_type || null,
        description: formData.description || null,
        status: formData.status,
      });
      setOpenAddDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create floor.");
    }
  };

  const handleOpenEdit = (f) => {
    setFloorToEdit(f);
    setFormData({
      property_id: f.property_id || "",
      floor_number: f.floor_number || "",
      floor_name: f.floor_name || "",
      floor_type: f.floor_type || "",
      description: f.description || "",
      status: f.status || "ACTIVE"
    });
    setOpenEditDialog(true);
  };

  const handleEditFloor = async () => {
    try {
      await api.put(`/floors/${floorToEdit.id}`, {
        floor_number: formData.floor_number,
        property_id: formData.property_id,
        floor_name: formData.floor_name || null,
        floor_type: formData.floor_type || null,
        description: formData.description || null,
        status: formData.status,
      });
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update floor.");
    }
  };

  // Filter Logic
  const filteredByProperty = propertyFilter === "ALL"
    ? floors
    : floors.filter((f) => f.property_id === propertyFilter);

  const filteredFloors = filteredByProperty.filter(f =>
    `Floor ${f.floor_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.property_name && f.property_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedPropObj = properties.find(p => p.id === propertyFilter);
  const selectedPropName = selectedPropObj ? selectedPropObj.name : "All Properties";

  const renderFormFields = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2.5, mt: 1 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Property <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.property_id} onChange={(e) => handleFormChange("property_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled>Select a property</MenuItem>
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Floor Number <span style={{ color: "#EF4444" }}>*</span></Typography>
        <TextField fullWidth size="small" placeholder="Enter floor number (e.g. 1, 2, G, B1)" value={formData.floor_number} onChange={(e) => handleFormChange("floor_number", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Floor Name</Typography>
        <TextField fullWidth size="small" placeholder="Enter floor name (e.g. First Floor)" value={formData.floor_name} onChange={(e) => handleFormChange("floor_name", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Floor Type</Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.floor_type} onChange={(e) => handleFormChange("floor_type", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Select floor type</span></MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
            <MenuItem value="Basement">Basement</MenuItem>
            <MenuItem value="Rooftop">Rooftop</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Description</Typography>
        <TextField multiline rows={2} fullWidth size="small" placeholder="Enter description (optional)" value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>  
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, bgcolor: "#FAFBFC", minHeight: "100vh" }}>

      {/* Header Area */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
          Home &gt; Properties &gt; {propertyFilter !== "ALL" ? `${selectedPropName} > ` : ""} <span style={{ color: "#0F172A", fontWeight: 600 }}>Floors</span>
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
            Floors
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap", gap: 2, overflowX: "auto" }}>
          {/* Property Selector */}
          <Box sx={{ flexShrink: 0 }}>
            <FormControl size="small">
              <Select
                displayEmpty
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                sx={{
                  borderRadius: "8px",
                  bgcolor: "#fff",
                  minWidth: "220px",
                  "& fieldset": { borderColor: "#E2E8F0" },
                  "&:hover fieldset": { borderColor: "#CBD5E1" },
                  "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "1px" },
                  "& .MuiSelect-select": { padding: "8px 16px", display: "flex", flexDirection: "column" }
                }}
                renderValue={(selected) => {
                  const prop = properties.find(p => p.id === selected);
                  return (
                    <Box sx={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                      <Typography variant="caption" color="#94A3B8" fontWeight={600} sx={{ lineHeight: 1 }}>Property</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0F172A" sx={{ mt: 0.5 }}>{prop ? prop.name : "All Properties"}</Typography>
                    </Box>
                  )
                }}
              >
                <MenuItem value="ALL">All Properties</MenuItem>
                {properties.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              placeholder="Search floors..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: "#fff", borderRadius: "8px", width: "240px", "& fieldset": { borderColor: "#E2E8F0" } }
                }
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, bgcolor: "#fff", borderRadius: "8px", px: 2 }}
            >
              Filter
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ bgcolor: "#2563EB", textTransform: "none", borderRadius: "8px", px: 3, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}
            >
              Add Floor
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Data Table */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>FLOOR NO.</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>FLOOR NAME</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>FLOOR TYPE</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>TOTAL ROOMS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>STATUS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", whiteSpace: "nowrap" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredFloors.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                  No floors found matching your search.
                </td>
              </tr>
            ) : (
              filteredFloors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((f, idx) => (
                <tr key={f.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                      {f.floor_number}
                    </Typography>
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={600} color="#475569">
                      {f.floor_name || `Floor ${f.floor_number}`}
                    </Typography>
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={600} color="#475569">
                      {f.floor_type || "Standard"}
                    </Typography>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                      {f.room_count || 0}
                    </Typography>
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                    {f.status === "ACTIVE" ? (
                      <Chip label="Active" size="small" onClick={() => handleToggleFloorStatus(f)} sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", cursor: "pointer" }} />
                    ) : (
                      <Chip label="Inactive" size="small" onClick={() => handleToggleFloorStatus(f)} sx={{ bgcolor: "#FEE2E2", color: "#991B1B", fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", cursor: "pointer" }} />
                    )}
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <IconButton size="small" onClick={() => handleOpenEdit(f)} sx={{ color: "#2563EB" }}>
                      <CustomEditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleToggleFloorStatus(f)} sx={{ color: f.status === "ACTIVE" ? "#2563EB" : "#94A3B8" }}>
                      <CustomEyeIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteFloor(f.id)} sx={{ color: "#EF4444" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

      {/* Pagination Details matching mockup */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {filteredFloors.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredFloors.length)} of {filteredFloors.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredFloors.length}
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
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Add New Floor</Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleAddFloor} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Floor</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Edit Floor</Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleEditFloor} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
