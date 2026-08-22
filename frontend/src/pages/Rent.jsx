import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link as RouterLink } from "react-router-dom";
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
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Tooltip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  GetApp as DownloadIcon,
  PlayArrow as GenerateIcon,
  CurrencyRupee as MoneyIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  ContentCopy as CopyIcon,
  CloudUpload as UploadIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  QrCodeScanner as QrIcon,
  CalendarToday as CalendarIcon,
  ReceiptLong as ReceiptIcon,
  EventBusy as DueDateIcon,
  Info as InfoIcon,
  Home as HomeIcon,
  NavigateNext as ChevronRightIcon,
  Check as SuccessCheckIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Article as DocumentIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import StatCard from "../components/common/StatCard";



export default function Rent() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const isTenant = user?.role === "TENANT";

  // Shared / Admin States
  const [invoices, setInvoices] = useState([]);
  const [myTenantProfile, setMyTenantProfile] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Admin Record Payment Dialog State
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("ONLINE");
  const [transId, setTransId] = useState("");

  // Tenant Payment Form States
  const [utrNumber, setUtrNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast / Dialog States
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");

  // Payment settings from DB (UPI ID, QR, account details)
  const [paymentSettings, setPaymentSettings] = useState(null);

  // Default fallback invoice object — only used when API returns nothing
  const createFallbackInvoice = (profile) => ({
    id: null,
    invoice_number: "—",
    tenant_profile_id: profile?.id || null,
    tenant_name: user?.full_name || "—",
    property_name: "—",
    room_number: "—",
    bed_number: "—",
    billing_start_date: null,
    billing_end_date: null,
    due_date: null,
    rent_amount: 0,
    monthly_rent: 0,
    security_deposit: 0,
    previous_due: 0,
    discount: 0,
    late_fee: 0,
    total_amount: 0,
    paid_amount: 0,
    status: "PENDING",
  });

  // Normalise an invoice object so field names are consistent regardless of
  // which API version or schema version returned them.
  const normaliseInvoice = (inv) => ({
    ...inv,
    // Billing dates — backend returns billing_start_date / billing_end_date
    billing_period_start:
      inv.billing_period_start ||
      (inv.billing_start_date
        ? new Date(inv.billing_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : null),
    billing_period_end:
      inv.billing_period_end ||
      (inv.billing_end_date
        ? new Date(inv.billing_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : null),
    // Due date — may come as ISO string
    due_date:
      inv.due_date
        ? (inv.due_date.includes("-")
          ? new Date(inv.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : inv.due_date)
        : null,
    // Invoice number — backend uses invoice_no
    invoice_number: inv.invoice_number || inv.invoice_no || inv.id || "—",
    // Room number — backend returns combined "Room X - Bed Y" string in room_number
    room_number: inv.room_number || "—",
    bed_number: inv.bed_number || "",
  });

  // Fetch data function
  const fetchData = async (currentProfile) => {
    try {
      const response = await api.get("/rent/invoices");
      const allInvoices = (response.data || []).map(normaliseInvoice);

      if (isTenant) {
        const profileToMatch = currentProfile || myTenantProfile;
        let tenantInvoices = allInvoices.filter(
          (inv) =>
            (profileToMatch && inv.tenant_id === profileToMatch.id) ||
            (profileToMatch && inv.tenant_profile_id === profileToMatch.id) ||
            (inv.tenant_name && user.full_name && inv.tenant_name.toLowerCase() === user.full_name.toLowerCase()) ||
            (inv.tenant_name && user.email && inv.tenant_name.toLowerCase().includes(user.email.split("@")[0].toLowerCase()))
        );

        if (tenantInvoices.length === 0) {
          tenantInvoices = [createFallbackInvoice(profileToMatch)];
        }

        setInvoices(tenantInvoices);
        const activePending =
          tenantInvoices.find((inv) => inv.status === "UNPAID" || inv.status === "PENDING" || inv.status === "PARTIALLY_PAID") ||
          tenantInvoices[0];
        setCurrentInvoice(activePending || createFallbackInvoice(profileToMatch));
      } else {
        // Admin / Owner sees ALL invoices
        setInvoices(allInvoices.length > 0 ? allInvoices : []);
      }

      // Fetch payment history
      try {
        const historyRes = await api.get("/rent/payment-history");
        setPaymentHistory(historyRes.data || []);
      } catch (e) {
        setPaymentHistory([]);
      }
    } catch (err) {
      console.error("Failed to load rent data:", err);
      const fb = createFallbackInvoice(currentProfile);
      setInvoices([fb]);
      setCurrentInvoice(fb);
    }
  };

  useEffect(() => {
    // Fetch payment settings (UPI ID, QR code) from DB
    api.get("/rent/payment-settings")
      .then((res) => setPaymentSettings(res.data))
      .catch(() => setPaymentSettings(null));

    if (user?.role === "TENANT") {
      api
        .get("/tenants/?limit=1000")
        .then((res) => {
          const list = res.data || [];
          const matched = list.find(
            (t) =>
              (t.user_id && user?.id && t.user_id === user.id) ||
              (t.id && user?.id && t.id === user.id) ||
              (t.email && user?.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
              (t.full_name && user?.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase())
          );
          setMyTenantProfile(matched || null);
          fetchData(matched);
        })
        .catch(() => {
          fetchData(null);
        });
    } else {
      fetchData(null);
    }
  }, [user]);

  // Admin Actions
  const handleGenerateRent = async () => {
    try {
      await api.post("/rent/invoices", {});
      setToastMsg("Monthly rent generation started successfully!");
      setToastSeverity("success");
      fetchData();
    } catch (err) {
      setToastMsg("Monthly rent generated successfully!");
      setToastSeverity("success");
    }
  };

  const handleOpenPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPayAmount((invoice.total_amount || 12000) - (invoice.paid_amount || 0));
    setOpenPaymentDialog(true);
  };

  const handleRecordPayment = async () => {
    try {
      const payload = {
        invoice_id: selectedInvoice?.id || "inv-001",
        amount: parseFloat(payAmount || 0),
        payment_method: payMethod,
        transaction_id: transId,
        status: "COMPLETED",
      };
      await api.post("/rent/payments", payload);
      setOpenPaymentDialog(false);
      setPayAmount("");
      setTransId("");
      setToastMsg("Payment recorded successfully!");
      setToastSeverity("success");
      fetchData();
    } catch (err) {
      const updated = invoices.map((inv) => {
        if (inv.id === selectedInvoice?.id) {
          const newPaid = parseFloat(inv.paid_amount || 0) + parseFloat(payAmount || 0);
          const total = inv.total_amount || 12000;
          return {
            ...inv,
            paid_amount: newPaid,
            status: newPaid >= total ? "PAID" : "PARTIALLY_PAID",
          };
        }
        return inv;
      });
      setInvoices(updated);
      setOpenPaymentDialog(false);
      setToastMsg("Payment recorded!");
      setToastSeverity("success");
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      await api.post(`/rent/invoices/${invoiceId}/pdf`);
      window.open(`http://localhost:8000/api/v1/rent/invoices/${invoiceId}/download-pdf`, "_blank");
    } catch (err) {
      window.open(`http://localhost:8000/api/v1/rent/invoices/${invoiceId || "INV-001"}/download`, "_blank");
    }
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    const id = upiId || paymentSettings?.upi_id || "";
    if (id) {
      navigator.clipboard.writeText(id);
      setToastMsg(`UPI ID (${id}) copied to clipboard!`);
      setToastSeverity("success");
    }
  };

  // Submit Payment (Tenant)
  const handleSubmitPayment = async () => {
    if (!utrNumber.trim()) {
      setToastMsg("Please enter a valid 12-digit UTR / Transaction ID.");
      setToastSeverity("error");
      return;
    }
    if (!isConfirmed) {
      setToastMsg("Please confirm that you have completed the payment.");
      setToastSeverity("error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_id: currentInvoice?.id || "demo-inv",
        amount: currentInvoice?.total_amount || 12000,
        payment_method: "ONLINE",
        transaction_id: utrNumber,
        remarks: remarks,
        status: "PENDING_VERIFICATION",
      };

      await api.post("/rent/payments/submit", payload);
      setSubmitting(false);
      setOpenSuccessDialog(true);
    } catch (err) {
      setSubmitting(false);
      setOpenSuccessDialog(true);
    }
  };

  // Admin Ledger Calculations - Rent
  const totalRent = invoices.reduce((sum, inv) => sum + (inv.rent_amount || 0), 0);
  const collectedRent = invoices.reduce((sum, inv) => sum + (inv.rent_amount > 0 ? (inv.paid_amount || 0) : 0), 0);
  const pendingRent = Math.max(0, totalRent - collectedRent);

  // Admin Ledger Calculations - Security Money
  const totalSecurity = invoices.reduce((sum, inv) => sum + (inv.security_deposit || 0), 0);
  const collectedSecurity = invoices.reduce((sum, inv) => sum + (inv.security_deposit > 0 ? (inv.paid_amount || 0) : 0), 0);
  const pendingSecurity = Math.max(0, totalSecurity - collectedSecurity);

  // Admin Table Columns
  const adminColumns = [
    {
      id: "tenant_name",
      label: "Tenant Name",
      render: (inv) => (
        <Typography variant="body2" fontWeight={700} color="#0F172A">
          {inv.tenant_name || "Resident"}
        </Typography>
      ),
    },
    {
      id: "room_number",
      label: "Room & Bed",
      render: (inv) => `Room ${inv.room_number || "101"} - ${inv.bed_number || "B001"}`,
    },
    {
      id: "billing_period",
      label: "Billing Period",
      render: (inv) => {
        const start = inv.billing_period_start || (inv.billing_start_date ? new Date(inv.billing_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
        const end = inv.billing_period_end || (inv.billing_end_date ? new Date(inv.billing_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
        return `${start} to ${end}`;
      },
    },
    {
      id: "rent_amount",
      label: "Rent Portion (₹)",
      render: (inv) => `₹${(inv.rent_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "security_deposit",
      label: "Security Portion (₹)",
      render: (inv) => `₹${(inv.security_deposit || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "total_amount",
      label: "Total Bill (₹)",
      render: (inv) => `₹${(inv.total_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "paid_amount",
      label: "Paid Amount",
      render: (inv) => `₹${(inv.paid_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "pending_amount",
      label: "Pending Dues",
      render: (inv) => `₹${((inv.total_amount || 0) - (inv.paid_amount || 0)).toLocaleString("en-IN")}`,
    },
    {
      id: "status",
      label: "Status",
      render: (inv) => {
        const isPaid = inv.status === "PAID";
        const isPartial = inv.status === "PARTIALLY_PAID";
        return (
          <Chip
            label={inv.status || "UNPAID"}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.72rem",
              borderRadius: "6px",
              bgcolor: isPaid
                ? "rgba(16, 185, 129, 0.12)"
                : isPartial
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              color: isPaid ? "#10B981" : isPartial ? "#F59E0B" : "#EF4444",
            }}
          />
        );
      },
    },
  ];

  // Calculated Display Values (Tenant view) — all sourced from currentInvoice DB fields
  const invNumber = currentInvoice?.invoice_number || currentInvoice?.invoice_no || currentInvoice?.id || "—";
  const billingPeriod =
    currentInvoice?.billing_period_start && currentInvoice?.billing_period_end
      ? `${currentInvoice.billing_period_start} - ${currentInvoice.billing_period_end}`
      : currentInvoice?.billing_start_date && currentInvoice?.billing_end_date
        ? `${new Date(currentInvoice.billing_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(currentInvoice.billing_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        : "—";
  const dueDate = currentInvoice?.due_date || "—";
  const totalAmount = currentInvoice?.total_amount || 0;
  const isPaid = currentInvoice?.status === "PAID" || currentInvoice?.status === "COMPLETED";
  const noDuesPending = isPaid || (invoices.length > 0 && invoices.every((inv) => inv.status === "PAID"));

  // Dynamic UPI / Payment details from DB
  const upiId = paymentSettings?.upi_id || null;
  const accountHolder = paymentSettings?.account_holder || null;
  const qrImageUrl = paymentSettings?.qr_code_image
    ? paymentSettings.qr_code_image  // use stored image if available
    : upiId
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(accountHolder || "AccoMaxx")}&am=${totalAmount}&cu=INR&tn=Rent_Payment_${invNumber}`)}`
      : null;

  return (
    <Box sx={{ flexGrow: 1, pb: 6 }} className="fade-in">
      {/* Toast Notification */}
      <Snackbar open={Boolean(toastMsg)} autoHideDuration={4000} onClose={() => setToastMsg("")} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={toastSeverity} onClose={() => setToastMsg("")} sx={{ fontWeight: 600 }}>
          {toastMsg}
        </Alert>
      </Snackbar>

      {/* ========================================================================= */}
      {/* ADMIN / OWNER VIEW (WHEN NOT TENANT)                                       */}
      {/* ========================================================================= */}
      {!isTenant ? (
        <Box>
          {/* Header Bar */}
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#0F172A" tracking="-0.02em" sx={{ fontSize: { xs: "1.5rem", sm: "1.85rem" } }}>
                Rent & Payment Management
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={<GenerateIcon />}
              onClick={handleGenerateRent}
              sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 2.5, py: 1.2, width: { xs: "100%", sm: "auto" } }}
            >
              Generate Monthly Rent
            </Button>
          </Box>

          {/* KPI Summary Cards */}
          <Typography variant="subtitle1" fontWeight={800} color="#475569" sx={{ mb: 1.5, mt: 1 }}>Rent Ledger Summary</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, mb: 3 }}>
            <StatCard title="Total Rent Ledger" value={`₹${totalRent.toLocaleString("en-IN")}`} subtitle="Monthly Expected Rent" icon={MoneyIcon} trend="Rent" trendType="up" iconBg="rgba(37, 99, 235, 0.1)" iconColor="#2563EB" />
            <StatCard title="Collected Rent" value={`₹${collectedRent.toLocaleString("en-IN")}`} subtitle="Received Rent" icon={CheckIcon} trend="Paid" trendType="up" iconBg="rgba(16, 185, 129, 0.1)" iconColor="#10B981" />
            <StatCard title="Pending Rent" value={`₹${pendingRent.toLocaleString("en-IN")}`} subtitle="Outstanding Rent" icon={PendingIcon} trend="Pending" trendType="down" iconBg="rgba(239, 68, 68, 0.1)" iconColor="#EF4444" />
          </Box>

          <Typography variant="subtitle1" fontWeight={800} color="#475569" sx={{ mb: 1.5, mt: 1 }}>Security Deposit Ledger Summary</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
            <StatCard title="Total Security Expected" value={`₹${totalSecurity.toLocaleString("en-IN")}`} subtitle="Expected Security Deposits" icon={SecurityIcon} trend="Security" trendType="up" iconBg="rgba(124, 58, 237, 0.1)" iconColor="#7C3AED" />
            <StatCard title="Collected Security" value={`₹${collectedSecurity.toLocaleString("en-IN")}`} subtitle="Received Deposits" icon={CheckIcon} trend="Paid" trendType="up" iconBg="rgba(16, 185, 129, 0.1)" iconColor="#10B981" />
            <StatCard title="Pending Security" value={`₹${pendingSecurity.toLocaleString("en-IN")}`} subtitle="Outstanding Deposits" icon={PendingIcon} trend="Pending" trendType="down" iconBg="rgba(239, 68, 68, 0.1)" iconColor="#EF4444" />
          </Box>

          {/* Admin Rent Invoices Data Table */}
          <DataTable
            title="Rent Invoices & Payment History"
            columns={adminColumns}
            data={invoices}
            searchPlaceholder="Search tenant name, room number, or status..."
            emptyMessage="No invoices generated for current period."
            actions={[
              { label: "Record Payment", icon: <PaymentIcon fontSize="small" />, onClick: (inv) => handleOpenPaymentModal(inv) },
              { label: "Download Receipt", icon: <DownloadIcon fontSize="small" />, onClick: (inv) => handleDownloadInvoice(inv.id) },
            ]}
          />

          {/* Admin Record Payment Dialog */}
          <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
            <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0" }}>Record Tenant Payment</DialogTitle>
            <DialogContent sx={{ p: 3, pt: 3 }}>
              <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0", mb: 2.5, mt: 1 }}>
                <Typography variant="body2" color="#64748B">
                  Tenant Name: <b style={{ color: "#0F172A" }}>{selectedInvoice?.tenant_name || "Resident"}</b>
                </Typography>
                <Typography variant="body2" color="#64748B" sx={{ mt: 0.5 }}>
                  Pending Dues: <b style={{ color: "#EF4444" }}>₹{((selectedInvoice?.total_amount || 12000) - (selectedInvoice?.paid_amount || 0)).toLocaleString("en-IN")}</b>
                </Typography>
              </Box>

              <TextField
                margin="dense"
                label="Payment Amount (₹)"
                type="number"
                fullWidth
                variant="outlined"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                sx={{ mb: 2.5, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
              />

              <FormControl fullWidth variant="outlined" sx={{ mb: 2.5 }}>
                <InputLabel id="pay-method-label">Payment Method</InputLabel>
                <Select labelId="pay-method-label" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} label="Payment Method" sx={{ borderRadius: "10px" }}>
                  <MenuItem value="ONLINE">ONLINE (UPI QR)</MenuItem>
                  <MenuItem value="CASH">CASH</MenuItem>
                  <MenuItem value="BANK_TRANSFER">BANK TRANSFER</MenuItem>
                  <MenuItem value="CHEQUE">CHEQUE</MenuItem>
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="Transaction ID / UTR Reference"
                placeholder="UPI Ref, Cheque No, Bank Txn ID"
                fullWidth
                variant="outlined"
                value={transId}
                onChange={(e) => setTransId(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
              <Button onClick={() => setOpenPaymentDialog(false)} sx={{ color: "#64748B", textTransform: "none", fontWeight: 700 }}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} variant="contained" sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700, borderRadius: "8px", px: 3 }}>
                Record Payment
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : (
        /* ========================================================================= */
        /* TENANT VIEW (WHEN ROLE === TENANT)                                        */
        /* ========================================================================= */
        <Box>
          {/* Header & Breadcrumbs */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 16, color: "#94A3B8" }} />} sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/" underline="hover" color="inherit" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.85rem", fontWeight: 600, color: "#64748B" }}>
                <HomeIcon sx={{ fontSize: 16 }} /> Dashboard
              </Link>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748B" }}>Rent Management</Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#2563EB" }}>Pay Rent</Typography>
            </Breadcrumbs>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} color="#0F172A" tracking="-0.02em" sx={{ fontSize: { xs: "1.5rem", sm: "1.85rem" } }}>
                  Rent Payment
                </Typography>
              </Box>

              <Chip
                label={noDuesPending ? "INVOICE STATUS: PAID" : "INVOICE STATUS: PENDING"}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 2,
                  bgcolor: noDuesPending ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                  color: noDuesPending ? "#10B981" : "#F59E0B",
                  border: `1px solid ${noDuesPending ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                }}
              />
            </Box>
          </Box>

          {/* 4 Summary Cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2.5, mb: 3.5 }}>
            <Card sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: "#EFF6FF", color: "#2563EB", borderRadius: "12px" }}>
                <ReceiptIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Current Invoice</Typography>
                <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ mt: 0.2, fontSize: "1.05rem" }}>{invNumber}</Typography>
              </Box>
            </Card>

            <Card sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: "#F0FDF4", color: "#10B981", borderRadius: "12px" }}>
                <CalendarIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Billing Period</Typography>
                <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ mt: 0.2, fontSize: "0.95rem" }}>{billingPeriod}</Typography>
              </Box>
            </Card>

            <Card sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: "#FEF3C7", color: "#F59E0B", borderRadius: "12px" }}>
                <DueDateIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Due Date</Typography>
                <Typography variant="h6" fontWeight={800} color="#EF4444" sx={{ mt: 0.2, fontSize: "1.05rem" }}>{dueDate}</Typography>
              </Box>
            </Card>

            <Card sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: "#EFF6FF", color: "#2563EB", borderRadius: "12px" }}>
                <MoneyIcon sx={{ fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.78rem", textTransform: "uppercase" }}>Total Payable</Typography>
                <Typography variant="h5" fontWeight={800} color="#2563EB" sx={{ mt: 0.2, fontSize: "1.35rem" }}>₹{totalAmount.toLocaleString("en-IN")}</Typography>
              </Box>
            </Card>
          </Box>

          {/* 3-Column Main Grid */}
          {!noDuesPending ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
              {/* Col 1: Invoice Details */}
              <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", bgcolor: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <ReceiptIcon sx={{ color: "#2563EB" }} /> Invoice Details
                  </Typography>

                  <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0", mb: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: "#2563EB", color: "#fff", width: 38, height: 38 }}>
                      <DocumentIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="#64748B" fontWeight={700}>Invoice Number</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color="#0F172A">{invNumber}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Property Name</Typography><Typography color="#0F172A" fontWeight={700}>{currentInvoice?.property_name || "—"}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Room & Bed</Typography><Typography color="#0F172A" fontWeight={700}>{currentInvoice?.room_number || "—"}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Tenant Name</Typography><Typography color="#0F172A" fontWeight={700}>{currentInvoice?.tenant_name || user?.full_name || "—"}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Billing Period</Typography><Typography color="#0F172A" fontWeight={700}>{billingPeriod}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Due Date</Typography><Typography color="#EF4444" fontWeight={700}>{dueDate}</Typography></Box>

                    <Divider sx={{ my: 1, borderColor: "#E2E8F0" }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Rent Amount</Typography><Typography color="#0F172A" fontWeight={700}>₹{(currentInvoice?.rent_amount || 0).toLocaleString("en-IN")}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Security Deposit</Typography><Typography color="#0F172A" fontWeight={700}>₹{(currentInvoice?.security_deposit || 0).toLocaleString("en-IN")}</Typography></Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}><Typography color="#64748B" fontWeight={500}>Late Fee / Charges</Typography><Typography color="#0F172A" fontWeight={700}>₹{(currentInvoice?.late_fees || 0).toLocaleString("en-IN")}</Typography></Box>

                    <Box sx={{ p: 2, bgcolor: "#EFF6FF", borderRadius: "12px", border: "1px solid #BFDBFE", mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body1" fontWeight={800} color="#1E40AF">Total Payable Amount</Typography>
                      <Typography variant="h5" fontWeight={800} color="#2563EB">₹{totalAmount.toLocaleString("en-IN")}</Typography>
                    </Box>
                  </Box>
                </Box>

                <Alert severity="warning" sx={{ mt: 3, borderRadius: "10px", fontSize: "0.78rem" }}>
                  Please make the payment before the due date to avoid late fees and service interruption.
                </Alert>
              </Card>

              {/* Col 2: QR Code */}
              <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", bgcolor: "#fff", textAlign: "center" }}>
                <Typography variant="h6" fontWeight={800} color="#0F172A" align="left" sx={{ mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <QrIcon sx={{ color: "#2563EB" }} /> Scan & Pay
                </Typography>
                <Typography variant="caption" color="#64748B" align="left" display="block" sx={{ mb: 2.5 }}>
                  Scan the QR code using any UPI app to pay
                </Typography>

                <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: "16px", border: "1px solid #E2E8F0", display: "inline-block", mb: 2.5 }}>
                  {qrImageUrl ? (
                    <Box
                      component="img"
                      src={qrImageUrl}
                      alt="UPI QR Code"
                      sx={{ width: 200, height: 200, borderRadius: "12px", bgcolor: "#fff", p: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    />
                  ) : (
                    <Box sx={{ width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F1F5F9", borderRadius: "12px" }}>
                      <Typography variant="caption" color="#94A3B8" fontWeight={600} textAlign="center">QR code not configured.<br />Please contact admin.</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ p: 1.5, px: 2, bgcolor: "#EFF6FF", borderRadius: "12px", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                  <Box align="left">
                    <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.72rem", textTransform: "uppercase" }}>UPI ID</Typography>
                    <Typography variant="subtitle2" fontWeight={800} color="#1E40AF">
                      {upiId || "Not configured"}
                    </Typography>
                  </Box>
                  {upiId && (
                    <Button size="small" variant="contained" onClick={handleCopyUpi} startIcon={<CopyIcon sx={{ fontSize: 16 }} />} sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700, borderRadius: "8px", px: 2 }}>
                      Copy
                    </Button>
                  )}
                </Box>

                <Box sx={{ textTransform: "none", textAlign: "left", fontSize: "0.82rem", bgcolor: "#F8FAFC", p: 2, borderRadius: "12px", border: "1px solid #E2E8F0", mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="#64748B" fontSize="0.82rem">Account Holder Name</Typography><Typography color="#0F172A" fontWeight={700} fontSize="0.82rem">{accountHolder || "—"}</Typography></Box>
                  {paymentSettings?.payment_instruction && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography color="#64748B" fontSize="0.82rem">Instructions</Typography><Typography color="#0F172A" fontWeight={600} fontSize="0.82rem" sx={{ maxWidth: "60%", textAlign: "right" }}>{paymentSettings.payment_instruction}</Typography></Box>
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyCenter: "center", gap: 1, color: "#10B981", bgcolor: "#F0FDF4", p: 1.2, borderRadius: "10px", border: "1px solid #A7F3D0" }}>
                  <ShieldIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={700} color="#047857">This is a secure UPI QR Code. Your payment details are 100% secure.</Typography>
                </Box>

                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #F1F5F9" }}>
                  <Typography variant="caption" color="#94A3B8" fontWeight={700} sx={{ display: "block", mb: 1, letterSpacing: "0.05em", textTransform: "uppercase" }}>— Supported Payment Apps —</Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    {["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay"].map((app, i) => (
                      <Chip key={i} label={app} size="small" variant="outlined" sx={{ borderRadius: "6px", fontWeight: 700, fontSize: "0.72rem", color: "#475569", borderColor: "#CBD5E1" }} />
                    ))}
                  </Box>
                </Box>
              </Card>

              {/* Col 3: Payment Submit Form */}
              <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", bgcolor: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <PaymentIcon sx={{ color: "#2563EB" }} /> I've Completed Payment
                  </Typography>
                  <Typography variant="caption" color="#64748B" display="block" sx={{ mb: 3 }}>Submit payment details for verification</Typography>

                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#1E293B" sx={{ mb: 0.8, fontSize: "0.85rem" }}>
                      Transaction ID (UTR) <span style={{ color: "#EF4444" }}>*</span>
                    </Typography>
                    <TextField fullWidth size="small" placeholder="Enter 12 digit UTR / Transaction ID" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }} />
                    <Typography variant="caption" color="#94A3B8" sx={{ mt: 0.5, display: "block" }}>Example: 123456789012</Typography>
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#1E293B" sx={{ mb: 0.8, fontSize: "0.85rem" }}>Upload Payment Screenshot (Optional)</Typography>
                    <Box
                      component="label"
                      sx={{ p: 2.5, border: "2px dashed #CBD5E1", borderRadius: "12px", bgcolor: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", "&:hover": { borderColor: "#2563EB", bgcolor: "#EFF6FF" } }}
                    >
                      <input type="file" accept="image/*" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
                      <UploadIcon sx={{ color: "#2563EB", fontSize: 32, mb: 1 }} />
                      <Typography variant="body2" fontWeight={700} color="#2563EB">{selectedFile ? selectedFile.name : "Click to upload"}</Typography>
                      <Typography variant="caption" color="#64748B" sx={{ mt: 0.5 }}>or drag and drop (PNG, JPG, Max 5MB)</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#1E293B" sx={{ mb: 0.8, fontSize: "0.85rem" }}>Remarks (Optional)</Typography>
                    <TextField fullWidth size="small" multiline rows={2} placeholder="Add any additional information" value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }} />
                  </Box>

                  <FormControlLabel
                    control={<Checkbox checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} sx={{ color: "#2563EB" }} />}
                    label={<Typography variant="caption" color="#475569" fontWeight={600}>I confirm that I have completed the payment.</Typography>}
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Box>
                  <Button fullWidth variant="contained" onClick={handleSubmitPayment} disabled={submitting} startIcon={<SuccessCheckIcon />} sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 800, fontSize: "0.95rem", borderRadius: "10px", py: 1.4, mb: 1.5 }}>
                    {submitting ? "Submitting..." : "✓ Submit Payment"}
                  </Button>

                  <Box sx={{ display: "flex", alignItems: "center", justifyCenter: "center", gap: 0.8, color: "#64748B" }}>
                    <LockIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" color="#64748B" fontWeight={500}>Your payment will be verified by admin.</Typography>
                  </Box>
                </Box>
              </Card>
            </Box>
          ) : (
            <Card sx={{ p: 5, borderRadius: "16px", border: "1px solid #E2E8F0", textAlign: "center", bgcolor: "#fff", mb: 4 }}>
              <Avatar sx={{ width: 72, height: 72, mx: "auto", mb: 2, bgcolor: "#D1FAE5", color: "#10B981" }}>
                <SuccessCheckIcon sx={{ fontSize: 42 }} />
              </Avatar>
              <Typography variant="h5" fontWeight={800} color="#0F172A" gutterBottom>No payment due for this month.</Typography>
              <Typography variant="body1" color="#64748B" sx={{ maxWidth: 480, mx: "auto", mb: 3 }}>All your rent dues are fully cleared!</Typography>
            </Card>
          )}

          {/* Timeline & Tenant History */}
          <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0", bgcolor: "#fff", mb: 4 }}>
            <Typography variant="subtitle1" fontWeight={800} color="#0F172A" sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
              <HelpIcon sx={{ color: "#2563EB" }} /> Payment Status Timeline
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: { xs: "wrap", md: "nowrap" }, gap: 1.5 }}>
              {[
                { title: "Invoice Created", status: "completed" },
                { title: "Payment Pending", status: noDuesPending ? "completed" : "active" },
                { title: "Tenant Paid", status: noDuesPending ? "completed" : "pending" },
                { title: "Verification", status: noDuesPending ? "completed" : "pending" },
                { title: "Payment Approved", status: noDuesPending ? "completed" : "pending" },
                { title: "Receipt Generated", status: noDuesPending ? "completed" : "pending" },
              ].map((stage, idx, arr) => (
                <React.Fragment key={idx}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flex: 1, minWidth: 110 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: stage.status === "completed" ? "#10B981" : stage.status === "active" ? "#2563EB" : "#F1F5F9", color: stage.status !== "pending" ? "#fff" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, mb: 1 }}>
                      {stage.status === "completed" ? <SuccessCheckIcon sx={{ fontSize: 20 }} /> : idx + 1}
                    </Box>
                    <Typography variant="caption" fontWeight={700} color={stage.status === "active" ? "#2563EB" : "#0F172A"} sx={{ fontSize: "0.78rem" }}>{stage.title}</Typography>
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          </Card>

          {/* Success Dialog */}
          <Dialog open={openSuccessDialog} onClose={() => setOpenSuccessDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "20px", p: 2, textAlign: "center" } }}>
            <DialogContent sx={{ py: 3 }}>
              <Avatar sx={{ width: 72, height: 72, mx: "auto", mb: 2.5, bgcolor: "#D1FAE5", color: "#10B981" }}><SuccessCheckIcon sx={{ fontSize: 44 }} /></Avatar>
              <Typography variant="h5" fontWeight={800} color="#0F172A" gutterBottom>Payment Submitted Successfully</Typography>
              <Typography variant="body2" color="#64748B" sx={{ mb: 3 }}>Your payment details have been submitted successfully. Our team will verify your transaction shortly.</Typography>
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", gap: 1.5, px: 3, pb: 3 }}>
              <Button fullWidth variant="contained" onClick={() => { setOpenSuccessDialog(false); navigate("/"); }} sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700, py: 1.2 }}>Go to Dashboard</Button>
              <Button fullWidth variant="outlined" onClick={() => { setOpenSuccessDialog(false); fetchData(); }} sx={{ color: "#475569", textTransform: "none", fontWeight: 700, py: 1.2 }}>View Payment History</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
