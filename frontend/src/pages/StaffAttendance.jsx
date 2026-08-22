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
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import {
  Add as AddIcon,
  PeopleAlt as PeopleIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  Assessment as MonthlyIcon
} from "@mui/icons-material";
import api from "../services/api";

const parseTime = (timeStr) => {
  if (!timeStr || timeStr === "—" || timeStr === "-") return null;
  const match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12) {
    let [_, h, m, ampm] = match12;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
};

const format12Hour = (time24) => {
  if (!time24 || time24 === "—") return "";
  if (time24.toUpperCase().includes("AM") || time24.toUpperCase().includes("PM")) {
    return time24.replace(/(AM|PM)\s*(AM|PM)/ig, "$1").trim();
  }
  const [hStr, mStr] = time24.split(":");
  if (!hStr || !mStr) return time24;
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${mStr} ${ampm}`;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => (
  <Card sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
    <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon sx={{ color: iconColor, fontSize: 24 }} />
    </Box>
    <Box sx={{ minWidth: 0, overflow: "hidden" }}>
      <Typography sx={{ color: "#64748B", fontWeight: 600, fontSize: "0.75rem", mb: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</Typography>
      <Typography sx={{ color: "#0F172A", fontWeight: 800, fontSize: "1.25rem", mb: 0.5, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.65rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</Typography>
    </Box>
  </Card>
);

export default function StaffAttendance() {
  const user = useSelector((state) => state.auth.user);
  const [localUser, setLocalUser] = useState(null);
  const [records, setRecords] = useState([]);

  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  });

  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [statusVal, setStatusVal] = useState("PRESENT");
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("18:00");

  const fetchData = async () => {
    try {
      const meRes = await api.get("/auth/me");
      setLocalUser(meRes.data);
      const attRes = await api.get("/attendance/");
      setRecords(attRes.data || []);
    } catch (e) {
      console.error("Failed to load staff attendance data:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeUser = localUser || user;

  // Filter records to only this user
  const userRecords = records.filter((r) => {
    const userName = activeUser?.full_name?.toLowerCase() || "";
    const userEmailName = activeUser?.email?.split("@")[0].toLowerCase() || "";
    const recordName = r.staff_name?.toLowerCase() || "";
    return recordName === userName || recordName === userEmailName;
  });

  // Prepare matrix
  const currentMonth = monthFilter || new Date().toISOString().substring(0, 7);
  const [year, month] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return {
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      dayNum: i + 1,
      dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      isWeekend: d.getDay() === 0 // Sun = 0
    };
  });

  const recordsMap = {};
  userRecords.forEach(r => {
    if (r.date && r.date.startsWith(currentMonth)) {
      recordsMap[r.date] = r;
    }
  });

  // Calculate Metrics for the current month
  const monthRecords = Object.values(recordsMap);
  const presentDays = monthRecords.filter(r => r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF DAY" || r.status === "HALF_DAY").length;
  const absentDays = monthRecords.filter(r => r.status === "ABSENT" || r.status === "LEAVE").length;
  const lateDays = monthRecords.filter(r => r.status === "LATE").length;

  let totalOvertimeMins = 0;
  monthRecords.forEach(r => {
    if (r.check_in && r.check_out && r.check_in !== "—" && r.check_out !== "—") {
      const inMins = parseTime(r.check_in);
      const outMins = parseTime(r.check_out);
      if (inMins !== null && outMins !== null) {
        let totalMins = outMins - inMins;
        if (totalMins < 0) totalMins += 24 * 60;
        if (totalMins > 9 * 60) {
          totalOvertimeMins += (totalMins - 9 * 60);
        }
      }
    }
  });
  const otHours = Math.floor(totalOvertimeMins / 60);
  const otDisplay = otHours > 0 ? `${otHours}h ${totalOvertimeMins % 60}m` : "0";

  const totalWorkingDays = monthDays.filter(d => !d.isWeekend).length; // Exclude weekends from total expected days
  const attendancePct = totalWorkingDays > 0 ? Math.min(((presentDays / totalWorkingDays) * 100), 100).toFixed(1) : 0;

  const handleMarkAttendanceSubmit = async () => {
    try {
      await api.post("/attendance/", {
        staff_id: activeUser?.id,
        staff_name: activeUser?.full_name || activeUser?.email?.split("@")[0] || "Staff",
        role: activeUser?.role || "STAFF",
        date: new Date().toISOString().split("T")[0],
        check_in: format12Hour(checkInTime),
        check_out: format12Hour(checkOutTime),
        status: statusVal,
      });
      setOpenCheckIn(false);
      fetchData();
    } catch (err) {
      alert("Failed to mark attendance.");
    }
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 4 }} className="fade-in">
      <Box sx={{ mb: 4, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
            My Attendance
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            type="month"
            size="small"
            label="Month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px", "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCheckIn(true)}
            sx={{ bgcolor: "#2563EB", color: "#fff", height: "40px", borderRadius: "8px", textTransform: "none", fontWeight: 700, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}
          >
            Mark Attendance
          </Button>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 3, mb: 4 }}>
        <MetricCard
          title="Attendance Rate"
          value={`${attendancePct}%`}
          subtitle="This Month"
          icon={MonthlyIcon}
          iconBg="#F3E8FF"
          iconColor="#9333EA"
        />
        <MetricCard
          title="Total Present"
          value={`${presentDays} Days`}
          subtitle="This Month"
          icon={PresentIcon}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
        />
        <MetricCard
          title="Total Absent"
          value={`${absentDays} Days`}
          subtitle="This Month"
          icon={AbsentIcon}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
        <MetricCard
          title="Late Check-ins"
          value={`${lateDays} Days`}
          subtitle="This Month"
          icon={LateIcon}
          iconBg="#FFEDD5"
          iconColor="#EA580C"
        />
      </Box>

      {/* Grid View Table */}
      <TableContainer component={Paper} sx={{ borderRadius: "12px", border: "1px solid #E2E8F0", overflowX: "auto", boxShadow: "none" }}>
        <Table sx={{ borderCollapse: "collapse", "& .MuiTableCell-root": { border: "1px solid #E2E8F0 !important", p: 0.75, textAlign: "center" } }}>
          <TableHead sx={{ bgcolor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ minWidth: 100, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Emp Code</Typography></TableCell>
              <TableCell sx={{ minWidth: 150, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Full Name</Typography></TableCell>
              <TableCell sx={{ minWidth: 100, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Agent Status</Typography></TableCell>
              <TableCell sx={{ minWidth: 120, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Department</Typography></TableCell>
              <TableCell sx={{ minWidth: 100, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Team</Typography></TableCell>
              {monthDays.map(d => (
                <TableCell key={d.dateStr} sx={{ minWidth: 44, width: 44 }}>
                  <Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem" }}>{d.dayName}</Typography>
                  <Typography sx={{ color: "#2563EB", fontWeight: 600, fontSize: "0.85rem", mt: 0.5 }}>{d.dayNum}</Typography>
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 80, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>LWP</Typography></TableCell>
              <TableCell sx={{ minWidth: 80, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>OT</Typography></TableCell>
              <TableCell sx={{ minWidth: 90, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Paid Days</Typography></TableCell>
              <TableCell sx={{ minWidth: 120, p: 1 }}><Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Late Marks</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{activeUser?.employee_id || (activeUser?.id ? `EMP-${activeUser.id.substring(0, 4).toUpperCase()}` : "—")}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{activeUser?.full_name || activeUser?.email?.split("@")[0] || "—"}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: activeUser?.is_active === false ? "#DC2626" : "#16A34A", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{activeUser?.is_active === false ? "Inactive" : "Active"}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{activeUser?.department || "—"}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{activeUser?.designation || "—"}</Typography></TableCell>

              {monthDays.map(d => {
                const rec = recordsMap[d.dateStr];
                let status = "";
                let bgColor = "#FFFFFF";
                let textColor = "#475569";

                if (rec) {
                  const s = rec.status?.toUpperCase() || "PRESENT";
                  if (s === "PRESENT") { status = "P"; textColor = "#475569"; }
                  else if (s === "ABSENT") { status = "A"; textColor = "#475569"; }
                  else if (s === "LATE") { status = "L"; textColor = "#475569"; }
                  else if (s === "HALF DAY" || s === "HALF_DAY") { status = "HD"; textColor = "#475569"; }
                  else if (s === "LEAVE") { status = "L"; textColor = "#475569"; }
                } else if (d.isWeekend) {
                  status = "WO";
                  bgColor = "#FCE7F3"; // Pink background
                  textColor = "#DB2777"; // Pink text
                }

                return (
                  <TableCell key={d.dateStr} sx={{ bgcolor: bgColor, height: "48px" }}>
                    <Typography sx={{ color: textColor, fontWeight: 700, fontSize: "0.9rem" }}>
                      {status}
                    </Typography>
                  </TableCell>
                );
              })}

              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem" }}>{absentDays}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{otDisplay}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem" }}>{presentDays + monthDays.filter(d => d.isWeekend).length}</Typography></TableCell>
              <TableCell sx={{ p: 1 }}><Typography sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{`LC - ${lateDays} EG - 0`}</Typography></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mark Attendance Dialog */}
      <Dialog open={openCheckIn} onClose={() => setOpenCheckIn(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#0F172A" }}>
          Mark Daily Attendance
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
            <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
              <TextField label="Staff Name" fullWidth value={activeUser?.full_name || activeUser?.email?.split("@")[0] || ""} disabled />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
              <TextField label="Attendance Date *" type="date" fullWidth defaultValue={new Date().toISOString().split("T")[0]} InputLabelProps={{ shrink: true }} disabled />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
              <TextField label="Check-In Time *" type="time" fullWidth value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
              <TextField label="Check-Out Time *" type="time" fullWidth value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ gridColumn: "span 2" }}>
              <FormControl fullWidth>
                <InputLabel id="att-status">Attendance Status *</InputLabel>
                <Select labelId="att-status" value={statusVal} onChange={(e) => setStatusVal(e.target.value)} label="Attendance Status *">
                  <MenuItem value="PRESENT">PRESENT</MenuItem>
                  <MenuItem value="ABSENT">ABSENT</MenuItem>
                  <MenuItem value="LEAVE">ON LEAVE</MenuItem>
                  <MenuItem value="HALF_DAY">HALF DAY</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenCheckIn(false)} sx={{ color: "#64748B", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleMarkAttendanceSubmit} sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: "8px", textTransform: "none" }}>
            Submit Attendance
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
