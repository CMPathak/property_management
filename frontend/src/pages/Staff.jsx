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

const DEPARTMENT_DESIGNATIONS = {
  "Administration": [
    "Property Manager",
    "Assistant Manager",
    "Warden",
    "Hostel Superintendent"
  ],
  "Accounts & Finance": [
    "Accountant",
    "Cashier"
  ],
  "Security": [
    "Security Guard",
    "Security Supervisor"
  ],
  "Housekeeping": [
    "Housekeeping Staff",
    "Cleaner",
    "Janitor"
  ],
  "Maintenance": [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Painter",
    "AC Technician",
    "General Maintenance Technician"
  ],
  "Reception / Front Desk": [
    "Receptionist",
    "Front Desk Executive"
  ],
  "Kitchen / Mess": [
    "Mess Manager",
    "Cook",
    "Chef",
    "Kitchen Helper"
  ],
  "Laundry": [
    "Laundry Staff"
  ],
  "IT Support": [
    "IT Executive",
    "System Administrator"
  ],
  "Transport": [
    "Driver",
    "Transport Coordinator",
    "Helper"
  ]
};

const DEPARTMENTS = Object.keys(DEPARTMENT_DESIGNATIONS);

export default function Staff() {
  const currentUser = useSelector((state) => state.auth.user);
  const canAssignRole = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "OWNER";

  const [staffList, setStaffList] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);
  const [staffToView, setStaffToView] = useState(null);

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("user123");
  const [newRole, setNewRole] = useState("STAFF");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newDesignation, setNewDesignation] = useState(DEPARTMENT_DESIGNATIONS[DEPARTMENTS[0]][0]);
  const [newDepartment, setNewDepartment] = useState(DEPARTMENTS[0]);
  const [newShiftTiming, setNewShiftTiming] = useState("DAY");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("STAFF");
  const [editStatus, setEditStatus] = useState(true);
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editDesignation, setEditDesignation] = useState(DEPARTMENT_DESIGNATIONS[DEPARTMENTS[0]][0]);
  const [editDepartment, setEditDepartment] = useState(DEPARTMENTS[0]);
  const [editShiftTiming, setEditShiftTiming] = useState("DAY");

  const fetchStaff = async () => {
    try {
      // Fetch users and filter out TENANT role so only staff & team members show up
      const response = await api.get("/users/");
      const allUsers = response.data || [];
      const staffOnly = allUsers.filter((u) => u.role !== "TENANT");
      setStaffList(staffOnly);
    } catch (err) {
      console.error("Failed to load users list:", err);
      try {
        const staffRes = await api.get("/users?role=STAFF");
        const managerRes = await api.get("/users?role=MANAGER");
        const accountantRes = await api.get("/users?role=ACCOUNTANT");
        const ownerRes = await api.get("/users?role=OWNER");
        const combined = [...ownerRes.data, ...managerRes.data, ...accountantRes.data, ...staffRes.data];
        setStaffList(combined);
      } catch (e) {
        setStaffList([]);
      }
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleNewDepartmentChange = (dept) => {
    setNewDepartment(dept);
    const desigs = DEPARTMENT_DESIGNATIONS[dept] || [];
    setNewDesignation(desigs[0] || "");
  };

  const handleEditDepartmentChange = (dept) => {
    setEditDepartment(dept);
    const desigs = DEPARTMENT_DESIGNATIONS[dept] || [];
    setEditDesignation(desigs[0] || "");
  };

  const handleAddStaff = async () => {
    try {
      const payload = {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        phone_number: newPhone,
        role: newRole,
        is_active: true,
        is_verified: true,
        employee_id: newEmployeeId,
        designation: newDesignation,
        department: newDepartment,
        shift_timing: newShiftTiming,
      };
      await api.post("/users/", payload);
      setOpenAddDialog(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("user123");
      setNewEmployeeId("");
      setNewDepartment(DEPARTMENTS[0]);
      setNewDesignation(DEPARTMENT_DESIGNATIONS[DEPARTMENTS[0]][0]);
      setNewShiftTiming("DAY");
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to add user.");
    }
  };

  const handleOpenEdit = (s) => {
    setStaffToEdit(s);
    setEditName(s.full_name);
    setEditEmail(s.email);
    setEditPhone(s.phone_number || "");
    setEditRole(s.role);
    setEditStatus(s.is_active);
    setEditEmployeeId(s.employee_id || "");
    
    const targetDept = s.department || DEPARTMENTS[0];
    setEditDepartment(targetDept);
    setEditDesignation(s.designation || (DEPARTMENT_DESIGNATIONS[targetDept] ? DEPARTMENT_DESIGNATIONS[targetDept][0] : ""));
    setEditShiftTiming(s.shift_timing || "DAY");
    setOpenEditDialog(true);
  };

  const handleEditStaff = async () => {
    try {
      const payload = {
        email: editEmail,
        full_name: editName,
        phone_number: editPhone,
        role: editRole,
        is_active: editStatus,
        employee_id: editEmployeeId,
        designation: editDesignation,
        department: editDepartment,
        shift_timing: editShiftTiming,
      };
      await api.put(`/users/${staffToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update user details.");
    }
  };

  const handleOpenView = (s) => {
    setStaffToView(s);
    setOpenViewDialog(true);
  };

  const handleToggleStaffStatus = async (s) => {
    const nextActive = !s.is_active;
    setStaffList((prev) => prev.map((item) => (item.id === s.id ? { ...item, is_active: nextActive } : item)));
    try {
      await api.put(`/users/${s.id}`, { is_active: nextActive });
      fetchStaff();
    } catch (err) {
      console.error(err);
      setStaffList((prev) => prev.map((item) => (item.id === s.id ? { ...item, is_active: s.is_active } : item)));
      alert(err.response?.data?.detail || "Failed to update status.");
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete user.");
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "OWNER":
      case "SUPER_ADMIN":
        return "primary";
      case "MANAGER":
        return "secondary";
      case "TENANT":
        return "info";
      default:
        return "default";
    }
  };

  const columns = [
    {
      id: "full_name",
      label: "User Name",
      render: (s) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => handleOpenView(s)}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          {s.full_name || "Unnamed User"}
        </Typography>
      ),
    },
    {
      id: "employee_id",
      label: "Emp ID",
      render: (s) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {s.employee_id || "—"}
        </Typography>
      ),
    },
    {
      id: "designation",
      label: "Designation",
      render: (s) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {s.designation || "—"}
        </Typography>
      ),
    },
    {
      id: "department",
      label: "Department",
      render: (s) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {s.department || "—"}
        </Typography>
      ),
    },
    {
      id: "shift_timing",
      label: "Shift Timing",
      render: (s) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {s.shift_timing || "—"}
        </Typography>
      ),
    },
    {
      id: "phone_number",
      label: "Phone",
      render: (s) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {s.phone_number || "—"}
        </Typography>
      ),
    },
    {
      id: "email",
      label: "Email Address",
    },
    {
      id: "is_active",
      label: "Status",
      render: (s) => {
        const isActive = s.is_active !== false;
        return (
          <Chip
            label={isActive ? "ACTIVE" : "INACTIVE"}
            size="small"
            onClick={() => handleToggleStaffStatus(s)}
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
            Staff & Management Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive list of all team members (Owners, Property Managers, Accountants, and Operations Staff).
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Add User
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={staffList}
        searchPlaceholder="Search all users by name, email, phone, or role..."
        emptyMessage="No users registered in system."
        actions={[
          { label: "Edit User", icon: <CustomEditIcon fontSize="small" />, onClick: (s) => handleOpenEdit(s) },
          { label: "Toggle Status (Active/Inactive)", icon: <CustomEyeIcon fontSize="small" />, onClick: (s) => handleToggleStaffStatus(s) },
          { label: "Delete User", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (s) => handleDeleteStaff(s.id) },
        ]}
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>User Profile Details</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {staffToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="primary">
                {staffToView.full_name || "User Details"}
              </Typography>
              <Typography variant="body2">
                <b>Employee ID:</b> {staffToView.employee_id || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Designation:</b> {staffToView.designation || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Department:</b> {staffToView.department || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Shift Timing:</b> {staffToView.shift_timing || "—"}
              </Typography>
              <Typography variant="body2">
                <b>System Role:</b> {staffToView.role}
              </Typography>
              <Typography variant="body2">
                <b>Email:</b> {staffToView.email}
              </Typography>
              <Typography variant="body2">
                <b>Phone:</b> {staffToView.phone_number || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Status:</b> {staffToView.is_active ? "ACTIVE" : "INACTIVE"}
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
        <DialogTitle sx={{ fontWeight: 800 }}>Add New User</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            fullWidth
            variant="outlined"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Initial Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <TextField
              margin="dense"
              label="Employee ID"
              fullWidth
              variant="outlined"
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value)}
            />
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="new-designation-label">Designation</InputLabel>
              <Select
                labelId="new-designation-label"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                label="Designation"
              >
                {(DEPARTMENT_DESIGNATIONS[newDepartment] || []).map((desig) => (
                  <MenuItem key={desig} value={desig}>
                    {desig}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="new-department-label">Department</InputLabel>
              <Select
                labelId="new-department-label"
                value={newDepartment}
                onChange={(e) => handleNewDepartmentChange(e.target.value)}
                label="Department"
              >
                {DEPARTMENTS.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="new-shift-timing-label">Shift Timing</InputLabel>
              <Select
                labelId="new-shift-timing-label"
                value={newShiftTiming}
                onChange={(e) => setNewShiftTiming(e.target.value)}
                label="Shift Timing"
              >
                <MenuItem value="DAY">DAY (Day Shift)</MenuItem>
                <MenuItem value="NIGHT">NIGHT (Night Shift)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
            <InputLabel id="role-select-label">Account Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Account Role"
              disabled={!canAssignRole}
            >
              <MenuItem value="SUPER_ADMIN">SUPER_ADMIN (Super Admin)</MenuItem>
              <MenuItem value="OWNER">OWNER (Landlord)</MenuItem>
              <MenuItem value="MANAGER">MANAGER (Property Manager)</MenuItem>
              <MenuItem value="ACCOUNTANT">ACCOUNTANT (Accountant)</MenuItem>
              <MenuItem value="STAFF">STAFF (Operations)</MenuItem>
              <MenuItem value="TENANT">TENANT (Resident)</MenuItem>
            </Select>
            {!canAssignRole && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                * Role assignment is restricted to Owner / Super Admin accounts only.
              </Typography>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStaff} variant="contained" color="primary">
            Save User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit User Details</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            fullWidth
            variant="outlined"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-status-select-label">Status</InputLabel>
            <Select labelId="edit-status-select-label" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} label="Status">
              <MenuItem value={true}>ACTIVE</MenuItem>
              <MenuItem value={false}>INACTIVE</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <TextField
              margin="dense"
              label="Employee ID"
              fullWidth
              variant="outlined"
              value={editEmployeeId}
              onChange={(e) => setEditEmployeeId(e.target.value)}
            />
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="edit-designation-label">Designation</InputLabel>
              <Select
                labelId="edit-designation-label"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                label="Designation"
              >
                {(DEPARTMENT_DESIGNATIONS[editDepartment] || []).map((desig) => (
                  <MenuItem key={desig} value={desig}>
                    {desig}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="edit-department-label">Department</InputLabel>
              <Select
                labelId="edit-department-label"
                value={editDepartment}
                onChange={(e) => handleEditDepartmentChange(e.target.value)}
                label="Department"
              >
                {DEPARTMENTS.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
              <InputLabel id="edit-shift-timing-label">Shift Timing</InputLabel>
              <Select
                labelId="edit-shift-timing-label"
                value={editShiftTiming}
                onChange={(e) => setEditShiftTiming(e.target.value)}
                label="Shift Timing"
              >
                <MenuItem value="DAY">DAY (Day Shift)</MenuItem>
                <MenuItem value="NIGHT">NIGHT (Night Shift)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <FormControl fullWidth variant="outlined" sx={{ mt: 2, mb: 1 }}>
            <InputLabel id="edit-role-select-label">Account Role</InputLabel>
            <Select
              labelId="edit-role-select-label"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              label="Account Role"
              disabled={!canAssignRole}
            >
              <MenuItem value="SUPER_ADMIN">SUPER_ADMIN (Super Admin)</MenuItem>
              <MenuItem value="OWNER">OWNER (Landlord)</MenuItem>
              <MenuItem value="MANAGER">MANAGER (Property Manager)</MenuItem>
              <MenuItem value="ACCOUNTANT">ACCOUNTANT (Accountant)</MenuItem>
              <MenuItem value="STAFF">STAFF (Operations)</MenuItem>
              <MenuItem value="TENANT">TENANT (Resident)</MenuItem>
            </Select>
            {!canAssignRole && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                * Role modification is restricted to Owner / Super Admin accounts only.
              </Typography>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditStaff} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
