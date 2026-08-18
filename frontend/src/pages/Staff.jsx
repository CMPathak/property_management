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
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  InputAdornment,
  TablePagination,
  Avatar,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  People as GroupIcon,
  VerifiedUser as ActiveIcon,
  Business as DepartmentIcon,
  AssignmentInd as DutyIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

const roleLabels = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  STAFF: "STAFF",
  TENANT: "TENANT"
};



const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Staff() {
  const currentUser = useSelector((state) => state.auth.user);
  const canAssignRole = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "OWNER";

  const [staffList, setStaffList] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);
  const [staffToView, setStaffToView] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [departmentDesignations, setDepartmentDesignations] = useState({});
  const [departments, setDepartments] = useState([]);

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("user123");
  const [newRole, setNewRole] = useState("STAFF");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newShiftTiming, setNewShiftTiming] = useState("DAY");
  const [newBloodGroup, setNewBloodGroup] = useState("");
  const [newIssueDate, setNewIssueDate] = useState("");
  const [newValidTill, setNewValidTill] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newGender, setNewGender] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newEmploymentType, setNewEmploymentType] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [addTab, setAddTab] = useState(0);
  const [newIdProofFile, setNewIdProofFile] = useState(null);
  const [newResumeFile, setNewResumeFile] = useState(null);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("STAFF");
  const [editStatus, setEditStatus] = useState(true);
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editShiftTiming, setEditShiftTiming] = useState("DAY");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editIssueDate, setEditIssueDate] = useState("");
  const [editValidTill, setEditValidTill] = useState("");
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editExistingPhotoUrl, setEditExistingPhotoUrl] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editTab, setEditTab] = useState(0);
  const [editIdProofFile, setEditIdProofFile] = useState(null);
  const [editResumeFile, setEditResumeFile] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
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
        const ownerRes = await api.get("/users?role=OWNER");
        const combined = [...ownerRes.data, ...staffRes.data];
        setStaffList(combined);
      } catch (e) {
        setStaffList([]);
      }
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/staff/departments");
      const data = response.data || {};
      setDepartmentDesignations(data);
      const depts = Object.keys(data);
      setDepartments(depts);
      if (depts.length > 0) {
        setNewDepartment(prev => prev || depts[0]);
        setNewDesignation(prev => prev || data[depts[0]][0]);
        setEditDepartment(prev => prev || depts[0]);
        setEditDesignation(prev => prev || data[depts[0]][0]);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const handleNewDepartmentChange = (dept) => {
    setNewDepartment(dept);
    const desigs = departmentDesignations[dept] || [];
    setNewDesignation(desigs[0] || "");
  };

  const handleEditDepartmentChange = (dept) => {
    setEditDepartment(dept);
    const desigs = departmentDesignations[dept] || [];
    setEditDesignation(desigs[0] || "");
  };

  const handleAddStaff = async () => {
    try {
      const payload = {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        phone_number: newPhone,
        phone: newPhone,
        role: newRole,
        is_active: true,
        is_verified: true,
        employee_id: newEmployeeId,
        designation: newDesignation,
        department: newDepartment,
        shift_timing: newShiftTiming,
        blood_group: newBloodGroup || null,
        issue_date: newIssueDate || null,
        valid_till: newValidTill || null,
        gender: newGender || null,
        dob: newDob || null,
        address: newAddress || null,
        employment_type: newEmploymentType || null,
      };
      const response = await api.post("/users/", payload);
      const createdUser = response.data;

      // Handle profile picture upload if selected
      if (newPhotoFile && createdUser?.id) {
        const formData = new FormData();
        formData.append("file", newPhotoFile);
        await api.post(`/staff/${createdUser.id}/upload-photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setOpenAddDialog(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("user123");
      setNewEmployeeId("");
      setNewDepartment(departments[0] || "");
      setNewDesignation(departmentDesignations[departments[0]]?.[0] || "");
      setNewShiftTiming("DAY");
      setNewBloodGroup("");
      setNewIssueDate("");
      setNewValidTill("");
      setNewGender("");
      setNewDob("");
      setNewAddress("");
      setNewEmploymentType("");
      setNewPhotoFile(null);
      fetchStaff();
      setSuccessMsg("Staff member added successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to add user.");
    }
  };

  const handleOpenEdit = (s) => {
    setStaffToEdit(s);
    setEditName(s.full_name || "");
    setEditEmail(s.email || "");
    setEditPhone(s.phone_number || s.phone || "");
    setEditRole(s.role || "STAFF");
    setEditStatus(s.is_active !== false);
    setEditEmployeeId(s.employee_id || "");

    const targetDept = s.department || departments[0];
    setEditDepartment(targetDept);
    setEditDesignation(s.designation || (departmentDesignations[targetDept] ? departmentDesignations[targetDept][0] : ""));
    setEditShiftTiming(s.shift_timing || "DAY");
    setEditBloodGroup(s.blood_group || "");
    
    // Format date string correctly for <input type="date" />
    setEditIssueDate(s.issue_date ? s.issue_date.substring(0, 10) : "");
    setEditValidTill(s.valid_till ? s.valid_till.substring(0, 10) : "");
    setEditPhotoFile(null);
    setEditExistingPhotoUrl(s.photo_url || "");
    setEditGender(s.gender || "");
    setEditDob(s.dob ? s.dob.substring(0, 10) : "");
    setEditAddress(s.address || "");
    setEditEmploymentType(s.employment_type || "");
    setEditIdProofFile(null);
    setEditResumeFile(null);
    setEditTab(0);
    setOpenEditDialog(true);
  };

  const handleEditStaff = async () => {
    try {
      const payload = {
        email: editEmail,
        full_name: editName,
        phone_number: editPhone,
        phone: editPhone,
        role: editRole,
        is_active: editStatus,
        employee_id: editEmployeeId,
        designation: editDesignation,
        department: editDepartment,
        shift_timing: editShiftTiming,
        blood_group: editBloodGroup || null,
        issue_date: editIssueDate || null,
        valid_till: editValidTill || null,
        gender: editGender || null,
        dob: editDob || null,
        address: editAddress || null,
        employment_type: editEmploymentType || null,
      };
      await api.put(`/users/${staffToEdit.id}`, payload);

      // Handle profile picture upload if selected
      if (editPhotoFile && staffToEdit?.id) {
        const formData = new FormData();
        formData.append("file", editPhotoFile);
        await api.post(`/staff/${staffToEdit.id}/upload-photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setOpenEditDialog(false);
      setEditPhotoFile(null);
      fetchStaff();
      setSuccessMsg("Staff member updated successfully!");
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
      setSuccessMsg(`Staff status updated to ${nextActive ? "Active" : "Inactive"} successfully!`);
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
      setSuccessMsg("Staff member deleted successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete user.");
    }
  };

  const handleDownloadIDCard = async (s) => {
    try {
      const response = await api.get(`/staff/${s.id}/id-card`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `staff_id_card_${s.employee_id || s.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ID card:", err);
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          alert(parsed.detail || "Failed to download ID card.");
        } catch (e) {
          alert("Failed to download ID card.");
        }
      } else {
        alert(err.response?.data?.detail || "Failed to download ID card. You may not have required permissions.");
      }
    }
  };

  const handlePrintIDCard = async (s) => {
    try {
      const response = await api.get(`/staff/${s.id}/id-card`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print ID Card - ${s.full_name || 'Staff'}</title>
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f1f5f9; }
                iframe { width: 100%; height: 100%; border: none; }
              </style>
            </head>
            <body>
              <iframe id="pdfFrame" src="${url}"></iframe>
              <script>
                const iframe = document.getElementById('pdfFrame');
                iframe.onload = () => {
                  setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        alert("Pop-up blocked! Please allow pop-ups for this website to print.");
      }
    } catch (err) {
      console.error("Failed to fetch ID card for printing:", err);
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          alert(parsed.detail || "Failed to print ID card.");
        } catch (e) {
          alert("Failed to print ID card.");
        }
      } else {
        alert(err.response?.data?.detail || "Failed to print ID card. You may not have required permissions.");
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "OWNER":
      case "SUPER_ADMIN":
        return "primary";
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
            label={isActive ? "Active" : "Inactive"}
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
    {
      id: "id_card",
      label: "ID Card",
      render: (s) => {
        const canGenerate = canAssignRole || currentUser?.id === s.id;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Download ID Card">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleDownloadIDCard(s)}
                  disabled={!canGenerate}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Print ID Card">
              <span>
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => handlePrintIDCard(s)}
                  disabled={!canGenerate}
                >
                  <PrintIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      }
    },
    {
      id: "action",
      label: "Actions",
      render: (s) => (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleOpenEdit(s)}
            sx={{ color: "#64748B", "&:hover": { bgcolor: "rgba(100,116,139,0.08)" } }}
          >
            <CustomEditIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Tooltip title={s.is_active !== false ? "Mark Inactive" : "Mark Active"}>
            <IconButton
              size="small"
              onClick={() => handleToggleStaffStatus(s)}
              sx={{ color: s.is_active !== false ? "#2563EB" : "#94A3B8", "&:hover": { bgcolor: "rgba(37,99,235,0.08)" } }}
            >
              {s.is_active !== false ? <CustomEyeIcon sx={{ fontSize: 20 }} /> : <VisibilityOffIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={() => handleDeleteStaff(s.id)}
            sx={{ color: "#EF4444", "&:hover": { bgcolor: "rgba(239,68,68,0.08)" } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Filter Staff List
  const filteredStaffList = staffList.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (s.full_name || "").toLowerCase().includes(q);
      const matchEmail = (s.email || "").toLowerCase().includes(q);
      const matchPhone = (s.phone_number || "").toLowerCase().includes(q);
      const matchRole = (s.role || "").toLowerCase().includes(q);
      const matchDesig = (s.designation || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRole && !matchDesig) return false;
    }
    if (departmentFilter !== "ALL" && s.department !== departmentFilter) return false;
    if (roleFilter !== "ALL" && s.role !== roleFilter) return false;
    if (statusFilter !== "ALL") {
      const isAct = s.is_active !== false;
      if (statusFilter === "Active" && !isAct) return false;
      if (statusFilter === "Inactive" && isAct) return false;
    }
    return true;
  });

  const paginatedStaff = filteredStaffList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Statistics
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.is_active !== false).length;
  const activePercentage = totalStaff ? ((activeStaff / totalStaff) * 100).toFixed(2) : "0.00";
  const uniqueDepartments = new Set(staffList.map((s) => s.department).filter(Boolean)).size;
  const onDutyCount = staffList.filter((s) => s.shift_timing === "DAY" || s.shift_timing === "ROTATIONAL").length;

  return (
    <Box sx={{ flexGrow: 1, pb: 6, minWidth: 0, maxWidth: "100%" }} className="fade-in">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
          Staff & Management Directory
        </Typography>
        <Typography variant="body2" color="#64748B">
          Manage your staff members, departments and access roles.
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3, mb: 4 }}>
        <Card elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: "12px", bgcolor: "#EFF6FF", display: "flex", justifyContent: "center", alignItems: "center", color: "#3B82F6" }}>
            <GroupIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mb: 0.5 }}>
              Total Staff
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
              {totalStaff}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5, fontWeight: 500 }}>
              All Staff Members
            </Typography>
          </Box>
        </Card>

        <Card elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: "12px", bgcolor: "#ECFDF5", display: "flex", justifyContent: "center", alignItems: "center", color: "#10B981" }}>
            <ActiveIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mb: 0.5 }}>
              Active Staff
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
              {activeStaff}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5, fontWeight: 500 }}>
              {activePercentage}% Active
            </Typography>
          </Box>
        </Card>

        <Card elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: "12px", bgcolor: "#F5F3FF", display: "flex", justifyContent: "center", alignItems: "center", color: "#8B5CF6" }}>
            <DepartmentIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mb: 0.5 }}>
              Departments
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
              {uniqueDepartments}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5, fontWeight: 500 }}>
              Total Departments
            </Typography>
          </Box>
        </Card>

        <Card elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: "12px", bgcolor: "#FFF7ED", display: "flex", justifyContent: "center", alignItems: "center", color: "#F97316" }}>
            <DutyIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mb: 0.5 }}>
              On Duty Today
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
              {onDutyCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5, fontWeight: 500 }}>
              Currently On Duty
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Action Bar */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 2, mb: 3, alignItems: "center", flexWrap: "nowrap", overflowX: "auto", pb: 1, width: "100%" }}>
        <TextField
          placeholder="Search staff by name, role, phone..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260, flexGrow: 1, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
        />
        <FormControl size="small" sx={{ minWidth: 150, flexShrink: 0 }}>
          <Select displayEmpty value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} sx={{ borderRadius: "8px", bgcolor: "#fff" }}>
            <MenuItem value="ALL">All Departments</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0 }}>
          <Select displayEmpty value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ borderRadius: "8px", bgcolor: "#fff" }}>
            <MenuItem value="ALL">All Roles</MenuItem>
            <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
            <MenuItem value="OWNER">OWNER</MenuItem>
            <MenuItem value="MANAGER">MANAGER</MenuItem>
            <MenuItem value="ACCOUNTANT">ACCOUNTANT</MenuItem>
            <MenuItem value="STAFF">STAFF</MenuItem>
            <MenuItem value="TENANT">TENANT</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0 }}>
          <Select displayEmpty value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ borderRadius: "8px", bgcolor: "#fff" }}>
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={() => setOpenAddDialog(true)}
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
          Add Staff
        </Button>
      </Box>

      {/* Table Section */}
      <DataTable
        columns={columns}
        data={filteredStaffList}
        searchPlaceholder="Search staff by name, role, phone..."
        emptyMessage="No staff members found matching your criteria."
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>User Profile Details</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {staffToView && (
            <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", flexDirection: { xs: "column", sm: "row" } }}>
              {/* Photo Display */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: { xs: "100%", sm: "auto" } }}>
                {staffToView.photo_url ? (
                  <img
                    src={`${api.defaults.baseURL.replace('/api/v1', '')}/${staffToView.photo_url}`}
                    alt={staffToView.full_name || "Staff"}
                    style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #1E3A8A" }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      bgcolor: "divider",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: "3px solid #64748B",
                      color: "text.secondary",
                      fontSize: "2.5rem",
                      fontWeight: 800
                    }}
                  >
                    {(staffToView.full_name || "S")[0].toUpperCase()}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Profile Picture
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1 }}>
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
                  <b>Blood Group:</b> {staffToView.blood_group || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <b>Issue Date:</b> {staffToView.issue_date ? staffToView.issue_date.substring(0, 10) : "—"}
                </Typography>
                <Typography variant="body2">
                  <b>Valid Till:</b> {staffToView.valid_till ? staffToView.valid_till.substring(0, 10) : "—"}
                </Typography>
                <Typography variant="body2">
                  <b>System Role:</b> {roleLabels[staffToView.role] || staffToView.role}
                </Typography>
                <Typography variant="body2">
                  <b>Email:</b> {staffToView.email}
                </Typography>
                <Typography variant="body2">
                  <b>Phone:</b> {staffToView.phone_number || "—"}
                </Typography>
                <Typography variant="body2">
                  <b>Status:</b> {staffToView.is_active ? "Active" : "Inactive"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "12px", width: "100%", maxWidth: "700px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>Add New Staff Member</Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ px: 3 }}>
          <Tabs value={addTab} onChange={(e, v) => setAddTab(v)} sx={{ borderBottom: "1px solid #E2E8F0", "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.9rem", color: "#64748B" }, "& .Mui-selected": { color: "#2563EB" } }}>
            <Tab label="Basic Information" />
            <Tab label="Job & Access" />
            <Tab label="Documents" />
          </Tabs>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {addTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Full Name <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Enter full name" value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Staff ID <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Auto generated" disabled sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#F8FAFC" } }} />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Department <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={newDepartment} onChange={(e) => handleNewDepartmentChange(e.target.value)} sx={{ borderRadius: "8px" }}>
                    {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Designation <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} sx={{ borderRadius: "8px" }}>
                    {(departmentDesignations[newDepartment] || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Mobile Number <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Enter mobile number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Email Address</Typography>
                  <TextField fullWidth size="small" placeholder="Enter email address" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Gender</Typography>
                  <Select fullWidth size="small" displayEmpty value={newGender} onChange={(e) => setNewGender(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value="">Select gender</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Date of Birth</Typography>
                  <TextField fullWidth size="small" type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Address</Typography>
                <TextField fullWidth size="small" multiline rows={3} placeholder="Enter full address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Joining Date <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" type="date" value={newIssueDate} onChange={(e) => setNewIssueDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Employment Type</Typography>
                  <Select fullWidth size="small" displayEmpty value={newEmploymentType} onChange={(e) => setNewEmploymentType(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value="">Select type</MenuItem>
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                  </Select>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={newStatus} onChange={(e) => setNewStatus(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Profile Photo</Typography>
                  <input accept="image/*" style={{ display: "none" }} id="add-photo-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setNewPhotoFile(e.target.files[0]); }} />
                  <label htmlFor="add-photo-upload">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} fullWidth sx={{ borderRadius: "8px", color: "#2563EB", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, py: 0.7 }}>
                      {newPhotoFile ? newPhotoFile.name.substring(0, 15) + "..." : "Upload Photo"}
                    </Button>
                  </label>
                  <Typography variant="caption" sx={{ color: "#94A3B8", mt: 0.5, display: "block" }}>JPG, PNG up to 2MB</Typography>
                </Box>
              </Box>
            </Box>
          )}

          {addTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Initial Password <span style={{ color: "#EF4444" }}>*</span></Typography>
                <TextField fullWidth size="small" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Account Role <span style={{ color: "#EF4444" }}>*</span></Typography>
                <Select fullWidth size="small" displayEmpty value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={!canAssignRole} sx={{ borderRadius: "8px" }}>
                  <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
                  <MenuItem value="OWNER">OWNER</MenuItem>
                  <MenuItem value="MANAGER">MANAGER</MenuItem>
                  <MenuItem value="ACCOUNTANT">ACCOUNTANT</MenuItem>
                  <MenuItem value="STAFF">STAFF</MenuItem>
                  <MenuItem value="TENANT">TENANT</MenuItem>
                </Select>
                {!canAssignRole && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                    * Role assignment is restricted to Owner / Super Admin accounts only.
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Shift Timing</Typography>
                <Select fullWidth size="small" displayEmpty value={newShiftTiming} onChange={(e) => setNewShiftTiming(e.target.value)} sx={{ borderRadius: "8px" }}>
                  <MenuItem value="DAY">Day Shift</MenuItem>
                  <MenuItem value="NIGHT">Night Shift</MenuItem>
                  <MenuItem value="ROTATIONAL">Rotational Shift</MenuItem>
                </Select>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Valid Till</Typography>
                <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={newValidTill} onChange={(e) => setNewValidTill(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>
            </Box>
          )}

          {addTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>ID Proof (Aadhar/PAN)</Typography>
                <input accept=".pdf,image/*" style={{ display: "none" }} id="id-proof-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setNewIdProofFile(e.target.files[0]); }} />
                <label htmlFor="id-proof-upload">
                  <Box sx={{ border: "2px dashed #E2E8F0", borderRadius: "8px", p: 3, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: "#2563EB", bgcolor: "#F8FAFC" }, transition: "all 0.2s" }}>
                    <CloudUploadIcon sx={{ color: "#94A3B8", fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 600 }}>{newIdProofFile ? newIdProofFile.name : "Click to upload ID Proof"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>SVG, PNG, JPG or PDF (max. 5MB)</Typography>
                  </Box>
                </label>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Resume / CV</Typography>
                <input accept=".pdf,.doc,.docx" style={{ display: "none" }} id="resume-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setNewResumeFile(e.target.files[0]); }} />
                <label htmlFor="resume-upload">
                  <Box sx={{ border: "2px dashed #E2E8F0", borderRadius: "8px", p: 3, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: "#2563EB", bgcolor: "#F8FAFC" }, transition: "all 0.2s" }}>
                    <CloudUploadIcon sx={{ color: "#94A3B8", fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 600 }}>{newResumeFile ? newResumeFile.name : "Click to upload Resume/CV"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>PDF or Word (max. 5MB)</Typography>
                  </Box>
                </label>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: "space-between" }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 4, borderColor: "#E2E8F0", color: "#0F172A" }}>
            Cancel
          </Button>
          <Button onClick={handleAddStaff} variant="contained" startIcon={<SaveIcon />} sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 4, bgcolor: "#2563EB", boxShadow: "none" }}>
            Save Staff Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "12px", width: "100%", maxWidth: "700px" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>Edit Staff Member</Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ px: 3 }}>
          <Tabs value={editTab} onChange={(e, v) => setEditTab(v)} sx={{ borderBottom: "1px solid #E2E8F0", "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.9rem", color: "#64748B" }, "& .Mui-selected": { color: "#2563EB" } }}>
            <Tab label="Basic Information" />
            <Tab label="Job & Access" />
            <Tab label="Documents" />
          </Tabs>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {editTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Full Name <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Enter full name" value={editName} onChange={(e) => setEditName(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Staff ID <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Auto generated" disabled value={editEmployeeId} onChange={(e) => setEditEmployeeId(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#F8FAFC" } }} />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Department <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={editDepartment} onChange={(e) => handleEditDepartmentChange(e.target.value)} sx={{ borderRadius: "8px" }}>
                    {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Designation <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} sx={{ borderRadius: "8px" }}>
                    {(departmentDesignations[editDepartment] || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Mobile Number <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" placeholder="Enter mobile number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Email Address</Typography>
                  <TextField fullWidth size="small" placeholder="Enter email address" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Gender</Typography>
                  <Select fullWidth size="small" displayEmpty value={editGender} onChange={(e) => setEditGender(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value="">Select gender</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Date of Birth</Typography>
                  <TextField fullWidth size="small" type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Address</Typography>
                <TextField fullWidth size="small" multiline rows={3} placeholder="Enter full address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Joining Date <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <TextField fullWidth size="small" type="date" value={editIssueDate} onChange={(e) => setEditIssueDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Employment Type</Typography>
                  <Select fullWidth size="small" displayEmpty value={editEmploymentType} onChange={(e) => setEditEmploymentType(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value="">Select type</MenuItem>
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                  </Select>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Status <span style={{ color: "#EF4444" }}>*</span></Typography>
                  <Select fullWidth size="small" displayEmpty value={editStatus} onChange={(e) => setEditStatus(e.target.value)} sx={{ borderRadius: "8px" }}>
                    <MenuItem value={true}>Active</MenuItem>
                    <MenuItem value={false}>Inactive</MenuItem>
                  </Select>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Profile Photo</Typography>
                  <input accept="image/*" style={{ display: "none" }} id="edit-photo-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setEditPhotoFile(e.target.files[0]); }} />
                  <label htmlFor="edit-photo-upload">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} fullWidth sx={{ borderRadius: "8px", color: "#2563EB", borderColor: "#E2E8F0", textTransform: "none", fontWeight: 600, py: 0.7 }}>
                      {editPhotoFile ? editPhotoFile.name.substring(0, 15) + "..." : "Upload Photo"}
                    </Button>
                  </label>
                  <Typography variant="caption" sx={{ color: "#94A3B8", mt: 0.5, display: "block" }}>JPG, PNG up to 2MB</Typography>
                </Box>
              </Box>
            </Box>
          )}

          {editTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Account Role <span style={{ color: "#EF4444" }}>*</span></Typography>
                <Select fullWidth size="small" displayEmpty value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={!canAssignRole} sx={{ borderRadius: "8px" }}>
                  <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
                  <MenuItem value="OWNER">OWNER</MenuItem>
                  <MenuItem value="MANAGER">MANAGER</MenuItem>
                  <MenuItem value="ACCOUNTANT">ACCOUNTANT</MenuItem>
                  <MenuItem value="STAFF">STAFF</MenuItem>
                  <MenuItem value="TENANT">TENANT</MenuItem>
                </Select>
                {!canAssignRole && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                    * Role assignment is restricted to Owner / Super Admin accounts only.
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Shift Timing</Typography>
                <Select fullWidth size="small" displayEmpty value={editShiftTiming} onChange={(e) => setEditShiftTiming(e.target.value)} sx={{ borderRadius: "8px" }}>
                  <MenuItem value="DAY">Day Shift</MenuItem>
                  <MenuItem value="NIGHT">Night Shift</MenuItem>
                  <MenuItem value="ROTATIONAL">Rotational Shift</MenuItem>
                </Select>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Valid Till</Typography>
                <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={editValidTill} onChange={(e) => setEditValidTill(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
              </Box>
            </Box>
          )}

          {editTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>ID Proof (Aadhar/PAN)</Typography>
                <input accept=".pdf,image/*" style={{ display: "none" }} id="edit-id-proof-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setEditIdProofFile(e.target.files[0]); }} />
                <label htmlFor="edit-id-proof-upload">
                  <Box sx={{ border: "2px dashed #E2E8F0", borderRadius: "8px", p: 3, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: "#2563EB", bgcolor: "#F8FAFC" }, transition: "all 0.2s" }}>
                    <CloudUploadIcon sx={{ color: "#94A3B8", fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 600 }}>{editIdProofFile ? editIdProofFile.name : "Click to upload ID Proof"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>SVG, PNG, JPG or PDF (max. 5MB)</Typography>
                  </Box>
                </label>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: "#1E293B" }}>Resume / CV</Typography>
                <input accept=".pdf,.doc,.docx" style={{ display: "none" }} id="edit-resume-upload" type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setEditResumeFile(e.target.files[0]); }} />
                <label htmlFor="edit-resume-upload">
                  <Box sx={{ border: "2px dashed #E2E8F0", borderRadius: "8px", p: 3, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: "#2563EB", bgcolor: "#F8FAFC" }, transition: "all 0.2s" }}>
                    <CloudUploadIcon sx={{ color: "#94A3B8", fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 600 }}>{editResumeFile ? editResumeFile.name : "Click to upload Resume/CV"}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>PDF or Word (max. 5MB)</Typography>
                  </Box>
                </label>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: "space-between" }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined" sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 4, borderColor: "#E2E8F0", color: "#0F172A" }}>
            Cancel
          </Button>
          <Button onClick={handleEditStaff} variant="contained" startIcon={<SaveIcon />} sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 4, bgcolor: "#2563EB", boxShadow: "none" }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={Boolean(successMsg)} autoHideDuration={4000} onClose={() => setSuccessMsg("")} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")} sx={{ width: "100%" }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
