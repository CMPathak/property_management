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
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
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
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState("SINGLE");
  const [newBaseRent, setNewBaseRent] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  // Edit Form State
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editRoomType, setEditRoomType] = useState("SINGLE");
  const [editBaseRent, setEditBaseRent] = useState("");
  const [editFloorId, setEditFloorId] = useState("");

  const fetchData = async () => {
    try {
      const floorsRes = await api.get("/properties/");
      setProperties(floorsRes.data);
      let allFloors = [];
      floorsRes.data.forEach((p) => {
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
          f.rooms.forEach((r) => roomsList.push({ ...r, floor_number: f.floor_number, floor_id: f.id }));
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
              const propsList = propsRes.data || [];
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
                                if (r.base_rent) foundRent = r.base_rent;
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
        .catch(() => {});
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
            My Room & Accommodation Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live database record of your property, room number, bed allocation, check-in, deposit, and amenities.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
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

          <Card sx={{ p: 3, borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                Need Assistance?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                If you have maintenance requests or need to report an issue in your room, submit a ticket directly to your Property Manager.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => (window.location.href = "/complaints")}
              sx={{ width: "100%", py: 1.2, fontWeight: 700 }}
            >
              Raise Maintenance Ticket
            </Button>
          </Card>
        </Box>
      </Box>
    );
  }

  const handleAddRoom = async () => {
    let targetFloorId = selectedFloorId;

    if (!targetFloorId && selectedPropertyId) {
      try {
        const floorRes = await api.post("/floors/", {
          floor_number: 1,
          property_id: selectedPropertyId,
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
        room_number: newRoomNumber,
        room_type: newRoomType,
        base_rent: parseFloat(newBaseRent) || 0,
        floor_id: targetFloorId,
      };
      await api.post("/rooms/", payload);
      setOpenAddDialog(false);
      setNewRoomNumber("");
      setNewBaseRent("");
      setSelectedFloorId("");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (r) => {
    setRoomToEdit(r);
    setEditRoomNumber(r.room_number);
    setEditRoomType(r.room_type);
    setEditBaseRent(r.base_rent);
    setEditFloorId(r.floor_id || "");
    setOpenEditDialog(true);
  };

  const handleEditRoom = async () => {
    try {
      const payload = {
        room_number: editRoomNumber,
        room_type: editRoomType,
        base_rent: parseFloat(editBaseRent),
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
    const nextActive = room.is_active === false ? true : false;
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, is_active: nextActive } : r)));
    try {
      await api.put(`/rooms/${room.id}`, { is_active: nextActive });
      fetchData();
    } catch (err) {
      console.error(err);
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, is_active: room.is_active } : r)));
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
      render: (r) => `₹${(r.base_rent || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "occupancy",
      label: "Occupancy Status",
      render: (r) => {
        const isFull = (r.occupied_count || 0) >= (r.capacity || 1);
        const isEmpty = (r.occupied_count || 0) === 0;
        let statusLabel = isEmpty ? "Vacant" : isFull ? "Full" : "Semi-Occupied";
        let statusColor = isEmpty ? "success" : isFull ? "error" : "warning";

        return <Chip label={`${statusLabel} (${r.occupied_count || 0}/${r.capacity || 1})`} color={statusColor} size="small" sx={{ borderRadius: "6px" }} />;
      },
    },
    {
      id: "is_active",
      label: "Status",
      render: (r) => {
        const isActive = r.is_active !== false;
        return (
          <Chip
            label={isActive ? "ACTIVE" : "INACTIVE"}
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

  const [roomFilter, setRoomFilter] = useState("ALL");

  const vacantRoomsCount = rooms.filter((r) => (r.occupied_count || 0) === 0 || (r.occupied_count || 0) < (r.capacity || 1)).length;
  const filteredRooms = rooms.filter((r) => {
    if (roomFilter === "VACANT") return (r.occupied_count || 0) === 0 || (r.occupied_count || 0) < (r.capacity || 1);
    if (roomFilter === "OCCUPIED") return (r.occupied_count || 0) >= (r.capacity || 1);
    return true;
  });

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Room Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage property rooms, base rents, floor assignments, and vacant bed capacity.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Add Room
        </Button>
      </Box>

      {/* Filter Chips for Vacant / Empty Rooms */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Chip
          label={`All Rooms (${rooms.length})`}
          clickable
          color={roomFilter === "ALL" ? "primary" : "default"}
          onClick={() => setRoomFilter("ALL")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
        <Chip
          label={`Vacant / Empty Rooms (${vacantRoomsCount})`}
          clickable
          color={roomFilter === "VACANT" ? "success" : "default"}
          onClick={() => setRoomFilter("VACANT")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
        <Chip
          label={`Full Rooms (${rooms.length - vacantRoomsCount})`}
          clickable
          color={roomFilter === "OCCUPIED" ? "error" : "default"}
          onClick={() => setRoomFilter("OCCUPIED")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
      </Box>

      <DataTable
        columns={columns}
        data={filteredRooms}
        searchPlaceholder="Search by room number, floor, or room type..."
        emptyMessage="No rooms found matching filter."
        actions={[
          { label: "Edit Room", icon: <CustomEditIcon fontSize="small" />, onClick: (r) => handleOpenEdit(r) },
          { label: "Toggle Status (Active/Inactive)", icon: <CustomEyeIcon fontSize="small" />, onClick: (r) => handleToggleRoomActive(r) },
          { label: "Delete", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (r) => handleDeleteRoom(r.id) },
        ]}
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Room Specifications</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {roomToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="primary">
                Room {roomToView.room_number}
              </Typography>
              <Typography variant="body2">
                <b>Floor:</b> Floor {roomToView.floor_number}
              </Typography>
              <Typography variant="body2">
                <b>Room Type:</b> {roomToView.room_type}
              </Typography>
              <Typography variant="body2">
                <b>Base Rent:</b> ₹{roomToView.base_rent}
              </Typography>
              <Typography variant="body2">
                <b>Capacity:</b> {roomToView.capacity || 1} Bed(s)
              </Typography>
              <Typography variant="body2">
                <b>Occupied Beds:</b> {roomToView.occupied_count || 0}
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
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Room</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="floor-select-label">Select Floor</InputLabel>
            <Select labelId="floor-select-label" value={selectedFloorId} onChange={(e) => setSelectedFloorId(e.target.value)} label="Select Floor">
              {floors.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  Floor {f.floor_number} ({f.property_name || "PG"})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Room Number"
            fullWidth
            variant="outlined"
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="room-type-label">Room Type</InputLabel>
            <Select labelId="room-type-label" value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)} label="Room Type">
              <MenuItem value="SINGLE">SINGLE</MenuItem>
              <MenuItem value="DOUBLE">DOUBLE</MenuItem>
              <MenuItem value="TRIPLE">TRIPLE</MenuItem>
              <MenuItem value="CUSTOM">CUSTOM</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Monthly Base Rent (₹)"
            type="number"
            fullWidth
            variant="outlined"
            value={newBaseRent}
            onChange={(e) => setNewBaseRent(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddRoom} variant="contained" color="primary">
            Save Room
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Room</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            margin="dense"
            label="Room Number"
            fullWidth
            variant="outlined"
            value={editRoomNumber}
            onChange={(e) => setEditRoomNumber(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-room-type-label">Room Type</InputLabel>
            <Select labelId="edit-room-type-label" value={editRoomType} onChange={(e) => setEditRoomType(e.target.value)} label="Room Type">
              <MenuItem value="SINGLE">SINGLE</MenuItem>
              <MenuItem value="DOUBLE">DOUBLE</MenuItem>
              <MenuItem value="TRIPLE">TRIPLE</MenuItem>
              <MenuItem value="CUSTOM">CUSTOM</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Monthly Base Rent (₹)"
            type="number"
            fullWidth
            variant="outlined"
            value={editBaseRent}
            onChange={(e) => setEditBaseRent(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditRoom} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
