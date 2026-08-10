import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  Divider,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  CurrencyRupee as MoneyIcon,
  AssignmentLate as PendingIcon,
  MeetingRoom as RoomIcon,
  SingleBed as BedIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  ReportProblem as ComplaintIcon,
  Notifications as NoticeIcon,
  ReceiptLong as ReceiptIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import api from "../services/api";
import StatCard from "../components/common/StatCard";
import DataTable from "../components/common/DataTable";
import WelcomeBanner from "../components/common/WelcomeBanner";
import PaymentDialog from "../components/billing/PaymentDialog";

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, bgcolor: "#FEE2E2", color: "#991B1B", borderRadius: 2, m: 3 }}>
          <Typography variant="h5" fontWeight="bold">Dashboard crashed!</Typography>
          <Typography sx={{ mt: 2 }}>{this.state.error?.toString()}</Typography>
          <pre style={{ overflow: "auto", fontSize: "12px", marginTop: "10px" }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </Box>
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user) || {
    full_name: "Rajesh Sharma",
    role: "OWNER",
  };

  const isTenant = user.role === "TENANT";

  // Owner Metrics State
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [bedsCount, setBedsCount] = useState(0);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  const [occupancy, setOccupancy] = useState([
    { name: "Occupied Beds", value: 0, color: "#2563EB" },
    { name: "Vacant Beds", value: 0, color: "#E2E8F0" },
  ]);
  const [occupiedPercent, setOccupiedPercent] = useState(0);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const [vacantCount, setVacantCount] = useState(0);

  const [recentComplaintsList, setRecentComplaintsList] = useState([]);
  const [recentPaymentsList, setRecentPaymentsList] = useState([]);
  const [upcomingRentDueList, setUpcomingRentDueList] = useState([]);

  const [revenueTrend, setRevenueTrend] = useState([
    { name: "Jan", revenue: 0 },
    { name: "Feb", revenue: 0 },
    { name: "Mar", revenue: 0 },
    { name: "Apr", revenue: 0 },
    { name: "May", revenue: 0 },
    { name: "Jun", revenue: 0 },
  ]);

  // Tenant Dynamic State
  const [tenantInfo, setTenantInfo] = useState({
    property: "Loading...",
    room: "—",
    bed: "—",
    monthlyRent: "₹0",
    dueAmount: "₹0",
    nextDueDate: "N/A",
    status: "ACTIVE",
  });

  const [tenantRentHistory, setTenantRentHistory] = useState([]);
  const [tenantNotices, setTenantNotices] = useState([]);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  const fetchDashboardData = async () => {
    try {
      if (isTenant) {
        // Dynamic Tenant Data Fetching
        let myProfile = null;
        try {
          const tenantsRes = await api.get("/tenants/?limit=1000");
          const allTenants = tenantsRes.data || [];
          myProfile = allTenants.find(
            (t) =>
              (t.user_id && user.id && t.user_id === user.id) ||
              (t.id && user.id && t.id === user.id) ||
              (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
              (t.full_name && user.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase())
          );
        } catch (e) {
          console.error("Failed to fetch tenant profile:", e);
        }

        let myInvoices = [];
        try {
          const invoicesRes = await api.get("/rent/invoices");
          const allInvoices = invoicesRes.data || [];
          if (myProfile) {
            myInvoices = allInvoices.filter((inv) => inv.tenant_profile_id === myProfile.id);
          } else {
            myInvoices = allInvoices.filter((inv) => inv.tenant_name === user.full_name);
          }
        } catch (e) {
          console.error("Failed to fetch tenant invoices:", e);
        }

        let myComplaints = [];
        try {
          const complaintsRes = await api.get("/complaints/");
          const allComplaints = complaintsRes.data || [];
          if (myProfile) {
            myComplaints = allComplaints.filter(
              (c) =>
                c.tenant_profile_id === myProfile.id ||
                (c.created_by && c.created_by === user.id) ||
                (c.tenant_name && user.full_name && c.tenant_name.toLowerCase() === user.full_name.toLowerCase())
            );
          }
        } catch (e) {
          console.error("Failed to fetch tenant complaints:", e);
        }
        
        try {
          const invRes = await api.get("/rent/current-invoice");
          if (invRes.data) {
             setCurrentInvoice(invRes.data);
          }
        } catch (e) {
          // ignore if 404
          setCurrentInvoice(null);
        }

        // Calculate dynamic values for tenant
        let propertyName = "Not Allocated";
        let propertyAddress = "No Property Assigned";
        let roomBedStr = myProfile?.room_bed || "Not Allocated";
        let monthlyRentVal = myProfile?.security_deposit ? Math.round(myProfile.security_deposit / 2) : 0;

        try {
          const propertiesRes = await api.get("/properties/");
          const propertiesList = propertiesRes.data || [];

          if (myProfile?.bed_id && propertiesList.length > 0) {
            propertiesList.forEach((p) => {
              if (p.floors) {
                p.floors.forEach((f) => {
                  if (f.rooms) {
                    f.rooms.forEach((r) => {
                      if (r.beds) {
                        r.beds.forEach((b) => {
                          if (b.id === myProfile.bed_id) {
                            propertyName = p.name;
                            propertyAddress = p.address || p.city || "Property Location";
                            roomBedStr = `Room ${r.room_number} - Bed ${b.bed_number}`;
                            if (r.base_rent) {
                              monthlyRentVal = r.base_rent;
                            }
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }

          // Fallback: If tenant is allocated a room/bed string but bed_id tree wasn't matched, pick first property name
          if (roomBedStr !== "Not Allocated" && roomBedStr !== "Unassigned" && propertyName === "Not Allocated" && propertiesList.length > 0) {
            propertyName = propertiesList[0].name;
            propertyAddress = propertiesList[0].address || "Main Complex";
          }
        } catch (err) {
          console.error("Failed to resolve tenant property info:", err);
        }

        let unpaidTotal = 0;
        let nextDue = "N/A";

        if (myInvoices.length > 0) {
          const formattedHistory = myInvoices.map((inv) => {
            const dueAmt = (inv.total_amount || inv.amount || 0) - (inv.amount_paid || 0);
            if (dueAmt > 0) unpaidTotal += dueAmt;
            if (inv.due_date && nextDue === "N/A") nextDue = inv.due_date;
            if (inv.total_amount) monthlyRentVal = inv.total_amount;

            return {
              id: inv.id,
              month: inv.billing_period_start ? `Period ${inv.billing_period_start.split("T")[0]}` : "Monthly Rent",
              amount: `₹${(inv.total_amount || inv.amount || 0).toLocaleString("en-IN")}`,
              paidOn: inv.amount_paid > 0 ? (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Paid") : "Unpaid",
              status: inv.status || (dueAmt === 0 ? "PAID" : "PENDING"),
            };
          });
          setTenantRentHistory(formattedHistory);
        } else {
          setTenantRentHistory([]);
        }

        setTenantInfo({
          property: propertyName,
          address: propertyAddress,
          roomBed: roomBedStr,
          monthlyRent: monthlyRentVal > 0 ? `₹${monthlyRentVal.toLocaleString("en-IN")}` : "₹8,500",
          dueAmount: `₹${unpaidTotal.toLocaleString("en-IN")}`,
          nextDueDate: nextDue,
          status: myProfile?.status || "ACTIVE",
        });

        // Dynamic Notices or Complaints
        const formattedNotices = myComplaints.slice(0, 5).map((c) => ({
          id: c.id,
          title: `Ticket: ${c.title} (${c.category})`,
          date: c.created_at ? new Date(c.created_at).toLocaleDateString() : "Recent",
        }));

        if (formattedNotices.length === 0) {
          setTenantNotices([
            { id: 1, title: "Welcome to Accoumaxx Property Portal", date: "Today" },
            { id: 2, title: "Monthly Maintenance & Facility Check Scheduled", date: "This Month" },
          ]);
        } else {
          setTenantNotices(formattedNotices);
        }

      } else {
        // Dynamic Owner Data Fetching
        const propertiesRes = await api.get("/properties/");
        const propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
        setPropertiesCount(propertiesData.length);

        let rooms = 0;
        let occupied = 0;
        let vacant = 0;
        let expectedRevenue = 0;

        propertiesData.forEach((p) => {
          if (p.floors) {
            p.floors.forEach((f) => {
              if (f.rooms) {
                rooms += f.rooms.length;
                f.rooms.forEach((r) => {
                  if (r.beds) {
                    const bedRent = (r.monthly_rent || r.base_rent || 0) / (r.beds.length || 1);
                    r.beds.forEach((b) => {
                      if (b.status === "OCCUPIED") {
                        occupied += 1;
                        expectedRevenue += bedRent;
                      }
                      else if (b.status === "VACANT") vacant += 1;
                    });
                  }
                });
              }
            });
          }
        });

        setRoomsCount(rooms);
        const totalBeds = occupied + vacant;
        setBedsCount(totalBeds);
        setOccupiedCount(occupied);
        setVacantCount(vacant);
        setOccupiedPercent(totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0);
        setOccupancy([
          { name: "Occupied Beds", value: occupied || 1, color: "#2563EB" },
          { name: "Vacant Beds", value: vacant || 1, color: "#E2E8F0" },
        ]);

        const tenantsRes = await api.get("/tenants/");
        const tenantsData = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
        setTenantsCount(tenantsData.length);

        const complaintsRes = await api.get("/complaints/");
        const complaintsData = Array.isArray(complaintsRes.data) ? complaintsRes.data : [];
        const formattedComplaints = complaintsData.slice(-4).reverse().map((c) => {
          let chipColor = "error";
          if (c.status === "RESOLVED" || c.status === "CLOSED") chipColor = "success";
          else if (c.status === "IN_PROGRESS" || c.status === "ASSIGNED") chipColor = "warning";

          return {
            id: c.id,
            title: c.subject || c.title || "Complaint",
            tenant: c.tenant_name || (c.tenant_profile?.user?.full_name) || "Tenant",
            status: c.status || "OPEN",
            color: chipColor,
            date: c.created_at ? new Date(c.created_at).toLocaleDateString() : "Recent",
          };
        });
        setRecentComplaintsList(formattedComplaints);

        const invoicesRes = await api.get("/rent/invoices");
        const invoicesData = Array.isArray(invoicesRes.data) ? invoicesRes.data : [];

        let collected = 0;
        let pending = 0;
        const currentDate = new Date();
        const monthWiseRevenue = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          monthWiseRevenue[d.toLocaleString("en-US", { month: "short" })] = 0;
        }

        invoicesData.forEach((inv) => {
          const amount = inv.total_amount || inv.amount || 0;
          const paid = inv.paid_amount || inv.amount_paid || 0;
          collected += paid;
          pending += amount - paid;

          if (inv.created_at) {
            const date = new Date(inv.created_at);
            const monthName = date.toLocaleString("en-US", { month: "short" });
            if (monthWiseRevenue[monthName] !== undefined) {
              monthWiseRevenue[monthName] += paid;
            }
          }
        });

        setTotalRevenue(expectedRevenue > 0 ? expectedRevenue : collected);
        setTotalPending(expectedRevenue > 0 ? (expectedRevenue - collected) : pending);

        const updatedTrend = Object.keys(monthWiseRevenue).map((month) => ({
          name: month,
          revenue: monthWiseRevenue[month],
        }));
        setRevenueTrend(updatedTrend);

        // Fetch Pending Payments for approval
        try {
          const paymentsRes = await api.get("/rent/payments?status=PENDING_VERIFICATION");
          const formattedPayments = (paymentsRes.data || []).map((pay) => ({
            id: pay.id,
            tenant: pay.tenant_name || pay.tenant_id || "Tenant",
            room: pay.room_number || "N/A",
            amount: `₹${(pay.amount || 0).toLocaleString("en-IN")}`,
            date: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "Today",
            status: pay.status,
            proof: pay.payment_proof,
            remarks: pay.remarks
          }));
          setRecentPaymentsList(formattedPayments);
        } catch(e) {
          console.error("Failed to fetch pending payments", e);
        }

        const pendingRes = await api.get("/rent/pending");
        const pendingData = Array.isArray(pendingRes.data) ? pendingRes.data : [];
        const formattedPending = pendingData.slice(0, 5).map((pInv) => {
          let statusText = "Pending";
          if (pInv.due_date) {
            const today = new Date();
            const due = new Date(pInv.due_date);
            const diffDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
            statusText = diffDays > 0 ? `Overdue (${diffDays}d)` : "Due soon";
          }
          return {
            id: pInv.id,
            name: pInv.tenant_name || "Resident",
            room: pInv.room_number || "Unassigned",
            amount: `₹${((pInv.total_amount || pInv.amount || 0) - (pInv.amount_paid || 0)).toLocaleString("en-IN")}`,
            dueDate: pInv.due_date || "Due Soon",
            status: statusText,
          };
        });
        setUpcomingRentDueList(formattedPending);
      }
    } catch (err) {
      console.error("Dashboard failed to retrieve backend datasets:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, width: "100%" }} className="fade-in">
      {/* SaaS Welcome Hero Banner */}
      <WelcomeBanner
        name={user.full_name || "User"}
        role={user.role}
        title="Welcome back"
        subtitle={
          isTenant
            ? "Track your rent payments, maintenance requests, and announcements."
            : "Overview of portfolio performance, occupancy metrics, and rent collections."
        }
        actions={
          isTenant
            ? [
                { label: "Pay Rent", icon: <MoneyIcon />, onClick: () => navigate("/rent") },
                { label: "New Complaint", variant: "outlined", icon: <AddIcon />, onClick: () => navigate("/complaints") },
              ]
            : [
                { label: "Collect Rent", icon: <MoneyIcon />, onClick: () => navigate("/rent") },
                { label: "Add Tenant", variant: "outlined", icon: <AddIcon />, onClick: () => navigate("/tenants") },
              ]
        }
      />

      {/* TENANT DASHBOARD VIEW */}
      {isTenant ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
          {/* Tenant Overview Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              gap: 3,
            }}
          >
            <StatCard title="My Property" value={tenantInfo.property} subtitle={tenantInfo.address || "Assigned Complex"} icon={BusinessIcon} iconBg="rgba(37, 99, 235, 0.1)" iconColor="#2563EB" />
            <StatCard title="Room & Bed" value={tenantInfo.roomBed} subtitle="Allocated Space" icon={RoomIcon} iconBg="rgba(34, 197, 94, 0.1)" iconColor="#22C55E" />
            <StatCard title="Monthly Rent" value={tenantInfo.monthlyRent} subtitle="Cycle: 1st of month" icon={MoneyIcon} iconBg="rgba(245, 158, 11, 0.1)" iconColor="#F59E0B" />
            <StatCard title="Due Amount" value={tenantInfo.dueAmount} subtitle={`Next Due: ${tenantInfo.nextDueDate}`} icon={PendingIcon} iconBg="rgba(34, 197, 94, 0.1)" iconColor="#22C55E" trend={tenantInfo.dueAmount === "₹0" ? "Paid" : "Due"} trendType={tenantInfo.dueAmount === "₹0" ? "up" : "down"} />
          </Box>

          {/* Quick Actions Bar */}
          <Card sx={{ p: 2.5, borderRadius: "16px" }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<MoneyIcon />} 
                sx={{ width: { xs: "100%", sm: "auto" } }}
                onClick={() => navigate("/rent")}
              >
                Pay Current Rent
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ width: { xs: "100%", sm: "auto" } }} onClick={() => {
                if (currentInvoice) {
                  window.open(`http://localhost:8000/api/v1/rent/invoices/${currentInvoice.id}/download`, '_blank');
                } else {
                  alert("No invoice to download.");
                }
              }}>
                Download Latest Receipt
              </Button>
              <Button variant="outlined" startIcon={<ComplaintIcon />} sx={{ width: { xs: "100%", sm: "auto" } }} onClick={() => navigate("/complaints")}>
                Raise Maintenance Ticket
              </Button>
            </Box>
          </Card>

          {/* Rent History & Notices */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
            <DataTable
              title="Rent Payment History"
              emptyMessage="No payment records found."
              columns={[
                { id: "month", label: "Billing Period" },
                { id: "amount", label: "Amount" },
                { id: "paidOn", label: "Paid On / Status" },
                {
                  id: "status",
                  label: "Status",
                  render: (row) => <Chip label={row.status} size="small" color={row.status === "PAID" ? "success" : "warning"} sx={{ borderRadius: "6px" }} />,
                },
              ]}
              data={tenantRentHistory}
              actions={[
                { label: "Download Receipt", icon: <DownloadIcon fontSize="small" />, onClick: (row) => {
                   window.open(`http://localhost:8000/api/v1/rent/invoices/${row.id}/download`, '_blank');
                } },
              ]}
            />

            <Card sx={{ p: 3, borderRadius: "16px" }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <NoticeIcon color="primary" /> Recent Complaints & Notices
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {tenantNotices.map((n) => (
                  <Box key={n.id} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Typography variant="body2" fontWeight={600}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date: {n.date}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Box>
        </Box>
      ) : (
        /* OWNER DASHBOARD VIEW */
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
          {/* Owner KPI Row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              gap: 3,
            }}
          >
            <StatCard title="Total Properties" value={propertiesCount} subtitle="Active Sites" icon={BusinessIcon} trend="Synced" trendType="up" iconBg="rgba(37, 99, 235, 0.1)" iconColor="#2563EB" />
            <StatCard title="Total Rooms / Beds" value={`${roomsCount} / ${bedsCount}`} subtitle={`Occupancy: ${occupiedPercent}%`} icon={BedIcon} trend={`${occupiedPercent}%`} trendType="up" iconBg="rgba(34, 197, 94, 0.1)" iconColor="#22C55E" />
            <StatCard title="Monthly Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} subtitle="Expected Rent" icon={MoneyIcon} trend="Potential" trendType="up" iconBg="rgba(245, 158, 11, 0.1)" iconColor="#F59E0B" />
            <StatCard title="Pending Rent" value={`₹${totalPending.toLocaleString("en-IN")}`} subtitle="Outstanding Dues" icon={PendingIcon} trend="Due" trendType="down" iconBg="rgba(239, 68, 68, 0.1)" iconColor="#EF4444" />
          </Box>

          {/* Charts Row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" },
              gap: 3,
            }}
          >
            {/* Occupancy Donut Chart */}
            <Card sx={{ p: 3, borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Occupancy Status
                </Typography>
                <Chip label={`${occupiedPercent}% Full`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", position: "relative", height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={occupancy} innerRadius={65} outerRadius={88} paddingAngle={4} dataKey="value" cx="50%" cy="50%">
                      {occupancy.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {occupiedPercent}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Occupied
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, bgcolor: "#2563EB", mr: 1, borderRadius: "50%" }} />
                  {occupiedCount} Occupied
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, bgcolor: "#E2E8F0", mr: 1, borderRadius: "50%" }} />
                  {vacantCount} Vacant
                </Typography>
              </Box>
            </Card>

            {/* Monthly Revenue Trend Chart */}
            <Card sx={{ p: 3, borderRadius: "16px" }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Monthly Revenue Trend
              </Typography>
              <Box sx={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevSaas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRevSaas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Box>

          {/* Tables & Lists Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 3 }}>
            {/* Recent Payments Table */}
            <DataTable
              title="Pending Payments (Needs Approval)"
              searchPlaceholder="Search payments..."
              columns={[
                { id: "tenant", label: "Tenant ID" },
                { id: "amount", label: "Amount Paid" },
                { id: "date", label: "Date" },
                {
                  id: "status",
                  label: "Status",
                  render: (row) => <Chip label={row.status} size="small" color="warning" sx={{ borderRadius: "6px" }} />,
                },
              ]}
              data={recentPaymentsList}
              actions={[
                { label: "Approve", icon: <CheckCircleIcon fontSize="small" color="success" />, onClick: async (row) => {
                  try {
                    await api.post(`/rent/payments/${row.id}/approve`);
                    alert("Payment approved successfully!");
                    fetchDashboardData();
                  } catch (e) {
                    alert("Failed to approve payment");
                  }
                } },
                { label: "Reject", icon: <CloseIcon fontSize="small" color="error" />, onClick: async (row) => {
                  try {
                    await api.post(`/rent/payments/${row.id}/reject`);
                    alert("Payment rejected.");
                    fetchDashboardData();
                  } catch (e) {
                    alert("Failed to reject payment");
                  }
                } },
              ]}
            />

            {/* Recent Complaints List */}
            <Card sx={{ p: 3, borderRadius: "16px" }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Recent Complaints
                <Chip label={recentComplaintsList.length} size="small" color="error" />
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recentComplaintsList.map((c) => (
                  <Box key={c.id} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {c.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.tenant} • {c.date}
                      </Typography>
                    </Box>
                    <Chip label={c.status} size="small" color={c.color} sx={{ height: 22, fontSize: "0.7rem", borderRadius: "6px" }} />
                  </Box>
                ))}
                {recentComplaintsList.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    No recent complaints.
                  </Typography>
                )}
              </Box>
            </Card>
          </Box>

          {/* Upcoming Rent Due Table */}
          <DataTable
            title="Upcoming Rent Due Roster"
            searchPlaceholder="Search tenant or room..."
            columns={[
              { id: "name", label: "Tenant Name" },
              { id: "room", label: "Room" },
              { id: "amount", label: "Due Amount" },
              { id: "dueDate", label: "Due Date" },
              {
                id: "status",
                label: "Status",
                render: (row) => <Chip label={row.status} size="small" color={row.status.includes("Overdue") ? "error" : "warning"} sx={{ borderRadius: "6px" }} />,
              },
            ]}
            data={upcomingRentDueList}
            actions={[
              { label: "Send Reminder", icon: <NoticeIcon fontSize="small" />, onClick: () => {} },
            ]}
          />
        </Box>
      )}
      {/* End Dashboard Container */}
      <PaymentDialog 
        open={isPaymentDialogOpen} 
        onClose={() => setIsPaymentDialogOpen(false)} 
        invoice={currentInvoice} 
        onSuccess={() => {
          setIsPaymentDialogOpen(false);
          fetchDashboardData();
          alert("Payment submitted successfully. Pending owner approval.");
        }} 
      />
    </Box>
  );
}

export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
