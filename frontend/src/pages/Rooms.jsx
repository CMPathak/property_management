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
  Avatar,
  InputAdornment,
  IconButton,
  TablePagination,
  Snackbar,
  Tooltip
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Bed as BedIcon,
  MeetingRoom as DoorIcon,
  Domain as BuildingIcon,
  Build as ToolsIcon,
  PieChart as PieChartIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  VisibilityOff as VisibilityOffIcon
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Rooms() {
  const user = useSelector((state) => state.auth.user);
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [myTenantProfile, setMyTenantProfile] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);
  const [roomToView, setRoomToView] = useState(null);
  const [floors, setFloors] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    property_id: "",
    floor_id: "",
    room_number: "",
    room_type: "",
    capacity: "",
    base_rent: "",
    security_deposit: "",
    status: "ACTIVE",
    description: ""
  });

  // Filter State
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "property_id") next.floor_id = ""; // Reset floor when property changes
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      property_id: propertyFilter !== "ALL" ? propertyFilter : "",
      floor_id: floorFilter !== "ALL" ? floorFilter : "",
      room_number: "",
      room_type: "",
      capacity: "",
      base_rent: "",
      security_deposit: "",
      status: "ACTIVE",
      description: ""
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpenAddDialog(true);
  };

  const fetchData = async () => {
    try {
      const floorsRes = await api.get("/properties/");
      const activeProps = floorsRes.data.filter(p => p.status === "ACTIVE");
      setProperties(activeProps);
      let allFloors = [];
      activeProps.forEach((p) => {
        if (p.floors) {
          p.floors.forEach((f) => {
            allFloors.push({ ...f, property_name: p.name });
          });
        }
      });
      setFloors(allFloors);

      const roomsList = [];
      for (const f of allFloors) {
        if (f.rooms) {
          f.rooms.forEach((r) =>
            roomsList.push({
              ...r,
              floor_number: f.floor_number,
              floor_id: f.id,
              property_id: f.property_id,
              property_name: f.property_name,
            })
          );
        }
      }
      setRooms(roomsList);
    } catch (err) {
      console.error("Failed to load rooms:", err);
      setFloors([]);
      setRooms([]);
    }
  };

  const [dynamicRoomDetails, setDynamicRoomDetails] = useState({
    propertyName: "Loading...",
    propertyAddress: "—",
    floorNumber: "1",
    roomType: "SHARING",
    baseRent: 0,
  });

  useEffect(() => {
    fetchData();
    if (user?.role === "TENANT") {
      api
        .get("/tenants/?limit=1000")
        .then(async (res) => {
          const list = res.data || [];
          const matched = list.find(
            (t) =>
              (t.user_id && user.id && t.user_id === user.id) ||
              (t.id && user.id && t.id === user.id) ||
              (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
              (t.full_name && user.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase())
          );
          setMyTenantProfile(matched || null);

          if (matched) {
            try {
              const propsRes = await api.get("/properties/");
              const propsList = (propsRes.data || []).filter(p => p.status === "ACTIVE");
              let foundProp = "Main Property";
              let foundAddr = "Property Location";
              let foundFloor = "1";
              let foundType = "SHARING";
              let foundRent = matched.security_deposit ? Math.round(matched.security_deposit / 2) : 6000;

              if (matched.bed_id && propsList.length > 0) {
                propsList.forEach((p) => {
                  if (p.floors) {
                    p.floors.forEach((f) => {
                      if (f.rooms) {
                        f.rooms.forEach((r) => {
                          if (r.beds) {
                            r.beds.forEach((b) => {
                              if (b.id === matched.bed_id) {
                                foundProp = p.name;
                                foundAddr = p.address || p.city || "Property Location";
                                foundFloor = f.floor_number;
                                foundType = r.room_type || "DOUBLE SHARING";
                                if (r.monthly_rent) foundRent = r.monthly_rent;
                                else if (r.base_rent) foundRent = r.base_rent;
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              } else if (propsList.length > 0) {
                foundProp = propsList[0].name;
                foundAddr = propsList[0].address || "Main Complex";
              }

              setDynamicRoomDetails({
                propertyName: foundProp,
                propertyAddress: foundAddr,
                floorNumber: foundFloor,
                roomType: foundType,
                baseRent: foundRent,
              });
            } catch (e) {
              console.error("Failed to query property details:", e);
            }
          }
        })
        .catch(() => { });
    }
  }, [user]);

  const isTenant = user?.role === "TENANT";
  const isAllocated = Boolean(
    myTenantProfile &&
    (myTenantProfile.bed_id ||
      (myTenantProfile.room_bed &&
        myTenantProfile.room_bed !== "Not Allocated" &&
        myTenantProfile.room_bed !== "Unassigned"))
  );

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || "Failed to process request.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join(".") || "Field"}: ${e.msg}`).join("\n");
    }
    return JSON.stringify(detail);
  };

  // Dedicated Tenant View for "My Room"
  if (isTenant) {
    if (!isAllocated) {
      return (
        <Box sx={{ flexGrow: 1 }} className="fade-in">
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
              My Room & Accommodation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View your room allocation, bed details, and property amenities.
            </Typography>
          </Box>

          <Card sx={{ p: 4, borderRadius: "16px", textAlign: "center", bgcolor: "background.paper", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", my: 2 }}>
            <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "rgba(245, 158, 11, 0.12)", color: "#D97706" }}>
              <CustomEyeIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
              Room Allocation Pending
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto", mb: 3 }}>
              You have not been assigned a room or bed yet. Room details and monthly rent will be displayed here once allocated by your property manager.
            </Typography>
            <Chip label="STATUS: PENDING ALLOCATION" color="warning" sx={{ fontWeight: 700, borderRadius: "6px" }} />
          </Card>
        </Box>
      );
    }

    return (
      <Box sx={{ flexGrow: 1 }} className="fade-in">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            My Room
          </Typography>
        </Box>

        <Card sx={{ p: 3.5, borderRadius: "16px" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {myTenantProfile.room_bed || "Assigned Room"}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {dynamicRoomDetails.propertyName} • {dynamicRoomDetails.propertyAddress}
              </Typography>
            </Box>
            <Chip label="STATUS: ACTIVE ALLOCATION" color="success" sx={{ fontWeight: 700, borderRadius: "6px" }} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Resident Name
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {myTenantProfile.full_name || user.full_name}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Email / Contact Phone
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {myTenantProfile.email || user.email} {myTenantProfile.phone ? `(${myTenantProfile.phone})` : ""}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Check-In Date
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {myTenantProfile.check_in_date || "Active"}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Check-Out Date
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {myTenantProfile.check_out_date || "Not Scheduled"}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Monthly Rent Rate
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                ₹{(dynamicRoomDetails.baseRent || 0).toLocaleString("en-IN")} / month
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Security Deposit Paid
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                ₹{(myTenantProfile.security_deposit || 0).toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Room Specifications & Amenities
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Floor ${dynamicRoomDetails.floorNumber}`} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
            <Chip label={dynamicRoomDetails.roomType} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
            <Chip label="High-Speed Wi-Fi" size="small" variant="outlined" color="primary" />
            <Chip label="Air Conditioned" size="small" variant="outlined" color="primary" />
            <Chip label="Attached Washroom" size="small" variant="outlined" color="primary" />
            <Chip label="Housekeeping Included" size="small" variant="outlined" color="primary" />
          </Box>
        </Card>
      </Box>
    );
  }

  const handleAddRoom = async () => {
    let targetFloorId = formData.floor_id;

    if (!targetFloorId && formData.property_id) {
      try {
        const floorRes = await api.post("/floors/", {
          floor_number: 1,
          property_id: formData.property_id,
        });
        targetFloorId = floorRes.data.id;
      } catch (e) {
        alert(formatError(e));
        return;
      }
    }

    if (!targetFloorId) {
      alert("Please select a Floor or Property.");
      return;
    }

    try {
      const payload = {
        room_number: formData.room_number,
        room_type: formData.room_type,
        monthly_rent: parseFloat(formData.base_rent) || 0,
        floor_id: targetFloorId,
        capacity: parseInt(formData.capacity) || 1,
        is_active: formData.status === "ACTIVE"
      };
      await api.post("/rooms/", payload);
      setOpenAddDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (r) => {
    setRoomToEdit(r);
    setFormData({
      property_id: r.property_id || "",
      floor_id: r.floor_id || "",
      room_number: r.room_number || "",
      room_type: r.room_type || "",
      capacity: r.capacity || "",
      base_rent: r.monthly_rent || r.base_rent || "",
      security_deposit: r.security_deposit || "",
      status: r.status !== "MAINTENANCE" ? "ACTIVE" : "INACTIVE",
      description: r.description || ""
    });
    setOpenEditDialog(true);
  };

  const handleEditRoom = async () => {
    try {
      const payload = {
        room_number: formData.room_number,
        room_type: formData.room_type,
        monthly_rent: parseFloat(formData.base_rent) || 0,
        floor_id: formData.floor_id,
        capacity: parseInt(formData.capacity) || 1,
        status: formData.status === "ACTIVE" ? "AVAILABLE" : "MAINTENANCE"
      };
      await api.put(`/rooms/${roomToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update room details.");
    }
  };

  const handleOpenView = (r) => {
    setRoomToView(r);
    setOpenViewDialog(true);
  };

  const handleToggleRoomActive = async (room) => {
    const nextStatus = room.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: nextStatus } : r)));
    try {
      await api.put(`/rooms/${room.id}`, { status: nextStatus });
      fetchData();
    } catch (err) {
      console.error(err);
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: room.status } : r)));
      alert(formatError(err));
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete room.");
    }
  };

  const columns = [
    {
      id: "room_number",
      label: "Room No.",
      render: (r) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => handleOpenView(r)}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          Room {r.room_number}
        </Typography>
      ),
    },
    {
      id: "floor_number",
      label: "Floor",
      render: (r) => `Floor ${r.floor_number}`,
    },
    {
      id: "room_type",
      label: "Type",
      render: (r) => <Chip label={r.room_type} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "base_rent",
      label: "Monthly Rent",
      render: (r) => `₹${(r.monthly_rent || r.base_rent || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "occupancy",
      label: "Occupancy Status",
      render: (r) => {
        const occCount = r.beds ? r.beds.filter(b => b.status === "OCCUPIED").length : 0;
        const isFull = occCount >= (r.capacity || 1);
        const isEmpty = occCount === 0;
        let statusLabel = isEmpty ? "Vacant" : isFull ? "Full" : "Semi-Occupied";
        let statusColor = isEmpty ? "success" : isFull ? "error" : "warning";

        return <Chip label={`${statusLabel} (${occCount}/${r.capacity || 1})`} color={statusColor} size="small" sx={{ borderRadius: "6px" }} />;
      },
    },
    {
      id: "is_active",
      label: "Status",
      render: (r) => {
        const isActive = r.status !== "MAINTENANCE";
        return (
          <Chip
            label={isActive ? "AVAILABLE" : "MAINTENANCE"}
            size="small"
            onClick={() => handleToggleRoomActive(r)}
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

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status !== "MAINTENANCE" && ((r.beds ? r.beds.filter(b => b.status === "OCCUPIED").length : 0) < (r.capacity || 1))).length;
  const occupiedRooms = rooms.filter(r => r.status !== "MAINTENANCE" && ((r.beds ? r.beds.filter(b => b.status === "OCCUPIED").length : 0) >= (r.capacity || 1))).length;
  const maintenanceRooms = rooms.filter(r => r.status === "MAINTENANCE").length;

  const availablePerc = totalRooms ? ((availableRooms / totalRooms) * 100).toFixed(2) : "0.00";
  const occupiedPerc = totalRooms ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : "0.00";
  const maintenancePerc = totalRooms ? ((maintenanceRooms / totalRooms) * 100).toFixed(2) : "0.00";
  const occupancyRate = occupiedPerc;

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = String(r.room_number).includes(searchQuery || "") || (r.property_name && r.property_name.toLowerCase().includes((searchQuery || "").toLowerCase()));
    const matchesProperty = propertyFilter === "ALL" || r.property_id === propertyFilter;
    const matchesFloor = floorFilter === "ALL" || r.floor_id === floorFilter;

    let matchesStatus = true;
    const occCount = r.beds ? r.beds.filter(b => b.status === "OCCUPIED").length : 0;
    const isFull = occCount >= (r.capacity || 1);
    if (statusFilter === "AVAILABLE") matchesStatus = r.status !== "MAINTENANCE" && !isFull;
    if (statusFilter === "FULL") matchesStatus = r.status !== "MAINTENANCE" && isFull;
    if (statusFilter === "MAINTENANCE") matchesStatus = r.status === "MAINTENANCE";

    return matchesSearch && matchesProperty && matchesFloor && matchesStatus;
  });

  const renderFormFields = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2.5, mt: 1 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Property <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.property_id} onChange={(e) => handleFormChange("property_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose property</span></MenuItem>
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Select Floor <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small" disabled={!formData.property_id}>
          <Select value={formData.floor_id} onChange={(e) => handleFormChange("floor_id", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Choose floor</span></MenuItem>
            {floors.filter(f => f.property_id === formData.property_id).map(f => (
              <MenuItem key={f.id} value={f.id}>Floor {f.floor_number}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Room Number <span style={{ color: "#EF4444" }}>*</span></Typography>
        <TextField fullWidth size="small" placeholder="Enter room number (e.g., 101)" value={formData.room_number} onChange={(e) => handleFormChange("room_number", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Room Type <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.room_type} onChange={(e) => handleFormChange("room_type", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Select room type</span></MenuItem>
            <MenuItem value="SINGLE">Single</MenuItem>
            <MenuItem value="DOUBLE">Double</MenuItem>
            <MenuItem value="TRIPLE">Triple</MenuItem>
            <MenuItem value="CUSTOM">Dormitory</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Capacity <span style={{ color: "#EF4444" }}>*</span></Typography>
        <TextField fullWidth size="small" type="number" placeholder="Enter capacity (number of beds)" value={formData.capacity} onChange={(e) => handleFormChange("capacity", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Monthly Rent <span style={{ color: "#EF4444" }}>*</span></Typography>
        <TextField fullWidth size="small" type="number" placeholder="Enter monthly rent" value={formData.base_rent} onChange={(e) => handleFormChange("base_rent", e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ bgcolor: "#F1F5F9", py: 2.5, px: 2, borderLeft: "1px solid #CBD5E1", mr: -1.75, borderRadius: "0 8px 8px 0" }}>₹</InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" }, paddingRight: 0 } }} />
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Security Deposit</Typography>
        <TextField fullWidth size="small" type="number" placeholder="Enter security deposit" value={formData.security_deposit} onChange={(e) => handleFormChange("security_deposit", e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end" sx={{ bgcolor: "#F1F5F9", py: 2.5, px: 2, borderLeft: "1px solid #CBD5E1", mr: -1.75, borderRadius: "0 8px 8px 0" }}>₹</InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" }, paddingRight: 0 } }} />
      </Box>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
        <FormControl fullWidth size="small">
          <Select value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)} displayEmpty sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } }}>
            <MenuItem value="" disabled><span style={{ color: "#94A3B8" }}>Select status</span></MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Maintenance / Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.75, fontSize: "0.875rem" }}>Description</Typography>
        <TextField multiline rows={3} fullWidth size="small" placeholder="Enter description (optional)" value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "& fieldset": { borderColor: "#CBD5E1" } } }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, bgcolor: "#FAFBFC", minHeight: "100vh" }} className="fade-in">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
          Room Management
        </Typography>

      </Box>


      {/* Filters and Search Bar */}
      <Box sx={{ display: "flex", flexWrap: "nowrap", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 1.5, p: 1.5, px: 2, bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", alignItems: "flex-end" }}>
          <TextField
            placeholder="Search room number..."
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
                sx: { bgcolor: "#FAFBFC", borderRadius: "8px", width: "160px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }
              }
            }}
          />

          <FormControl size="small" sx={{ minWidth: "130px" }}>
            <Select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Properties</MenuItem>
              {properties.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: "110px" }}>
            <Select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Floors</MenuItem>
              {floors.map(f => (
                <MenuItem key={f.id} value={f.id}>Floor {f.floor_number}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: "110px" }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="FULL">Full</MenuItem>
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ height: "40px", flexShrink: 0, bgcolor: "#2563EB", textTransform: "none", borderRadius: "8px", px: 2.5, fontWeight: 600, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}
        >
          Add Room
        </Button>
      </Box>

      {/* Data Table */}
      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>ROOM NO.</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>PROPERTY</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>FLOOR</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>ROOM TYPE</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>CAPACITY</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>OCCUPIED BEDS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>MONTHLY RENT</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>STATUS</th>
              <th style={{ padding: "16px 24px", color: "#64748B", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                  No rooms found matching filters.
                </td>
              </tr>
            ) : (
              filteredRooms.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r, idx) => {
                const occ = r.beds ? r.beds.filter(b => b.status === "OCCUPIED").length : 0;
                const isFull = occ >= (r.capacity || 1);
                const isMaintenance = r.status === "MAINTENANCE";
                const capacity = r.capacity || 1;
                const left = capacity - occ;

                // Room Type Chip Styles
                let typeColor = "#3B82F6";
                let typeBg = "#EFF6FF";
                if (r.room_type?.toLowerCase() === "single") { typeColor = "#16A34A"; typeBg = "#DCFCE7"; }
                else if (r.room_type?.toLowerCase() === "triple") { typeColor = "#D97706"; typeBg = "#FEF3C7"; }
                else if (r.room_type?.toLowerCase() === "dormitory") { typeColor = "#9333EA"; typeBg = "#F3E8FF"; }

                // Beds / Status Color
                let bedColor = "#16A34A";
                let bedText = `${occ}/${capacity}`;
                let bedSubtext = "Available";

                let statColor = "#16A34A";
                let statBg = "#DCFCE7";
                let statText = "Available";

                if (isMaintenance) {
                  bedColor = "#D97706";
                  bedText = "-";
                  bedSubtext = "Maintenance";
                  statColor = "#D97706";
                  statBg = "#FEF3C7";
                  statText = "Maintenance";
                } else if (isFull) {
                  bedColor = "#DC2626";
                  bedSubtext = "Full";
                  statColor = "#DC2626";
                  statBg = "#FEE2E2";
                  statText = "Full";
                } else if (occ > 0) {
                  bedColor = "#16A34A";
                  bedSubtext = `${left} Available`;
                }

                return (
                  <tr key={r.id} onClick={() => handleOpenView(r)} style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer", "&:hover": { backgroundColor: "#F8FAFC" } }}>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {r.room_number}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {r.property_name || "—"}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {r.floor_number ? (r.floor_number === 0 ? "Ground Floor" : r.floor_number === 1 ? "First Floor" : r.floor_number === 2 ? "Second Floor" : r.floor_number === 3 ? "Third Floor" : `Floor ${r.floor_number}`) : "—"}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Chip label={r.room_type || "Single"} size="small" sx={{ bgcolor: typeBg, color: typeColor, fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem", textTransform: "capitalize" }} />
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {capacity}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: bedColor, lineHeight: 1.2 }}>{bedText}</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ color: bedColor, fontSize: "10px" }}>{bedSubtext}</Typography>
                      </Box>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        ₹ {(r.monthly_rent || r.base_rent || 0).toLocaleString("en-IN")}
                      </Typography>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Chip label={statText} size="small" sx={{ bgcolor: statBg, color: statColor, fontWeight: 700, borderRadius: "6px", height: "24px", fontSize: "0.75rem" }} />
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }} sx={{ color: "#0EA5E9" }}>
                          <CustomEditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Tooltip title={r.status !== "MAINTENANCE" ? "Mark Maintenance" : "Mark Available"}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleRoomActive(r); }} sx={{ color: r.status !== "MAINTENANCE" ? "#3B82F6" : "#94A3B8" }}>
                            {r.status !== "MAINTENANCE" ? <CustomEyeIcon sx={{ fontSize: 20 }} /> : <VisibilityOffIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(r.id); }} sx={{ color: "#EF4444" }}>
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
          Showing {filteredRooms.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredRooms.length)} of {filteredRooms.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredRooms.length}
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
          <Typography variant="h6" fontWeight={800} color="#0F172A">Room Details</Typography>
          <IconButton onClick={() => setOpenViewDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {roomToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Header section with Room Number & Status */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", bgcolor: "#FAFBFC", p: 2, borderRadius: "12px", border: "1px solid #F1F5F9" }}>
                <Box>
                  <Typography variant="h5" fontWeight={800} color="#0F172A">Room {roomToView.room_number}</Typography>
                  <Typography variant="body2" color="#64748B" sx={{ mt: 0.5 }}>{roomToView.property_name} • Floor {roomToView.floor_number}</Typography>
                </Box>
                <Chip label={roomToView.is_active === false ? "Maintenance" : ((roomToView.occupied_count || 0) >= (roomToView.capacity || 1) ? "Full" : "Available")} size="small" sx={{ fontWeight: 700, borderRadius: "6px" }} color={roomToView.is_active === false ? "warning" : ((roomToView.occupied_count || 0) >= (roomToView.capacity || 1) ? "error" : "success")} />
              </Box>

              {/* Info Grid */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Room Type</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5, textTransform: "capitalize" }}>{roomToView.room_type || "Single"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Base Rent</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>₹ {(roomToView.monthly_rent || roomToView.base_rent || 0).toLocaleString("en-IN")}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Capacity</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>{roomToView.capacity || 1} Bed(s)</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Occupied Beds</Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>{roomToView.occupied_count || 0} / {roomToView.capacity || 1}</Typography>
                </Box>
              </Box>

              {/* Description if available */}
              {roomToView.description && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="#94A3B8" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</Typography>
                  <Typography variant="body2" color="#475569" sx={{ mt: 0.5, lineHeight: 1.6 }}>{roomToView.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Add New Room</Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleAddRoom} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Room</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">Edit Room</Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined" sx={{ color: "#475569", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleEditRoom} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 600, px: 3, borderRadius: "8px", boxShadow: "none" }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
