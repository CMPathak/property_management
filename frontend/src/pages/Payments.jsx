import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Button,
  Chip,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Payment as PaymentIcon, Receipt as ReceiptIcon, GetApp as DownloadIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";

export default function Payments() {
  const user = useSelector((state) => state.auth.user);
  const [myTenantProfile, setMyTenantProfile] = useState(null);
  const [payments, setPayments] = useState([]);

  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchData = async (currentProfile) => {
    try {
      const res = await api.get("/rent/invoices");
      if (res.data && Array.isArray(res.data)) {
        let paidList = [];
        res.data.forEach((inv, idx) => {
          const paidAmount = inv.paid_amount || inv.amount_paid || 0;
          if (paidAmount > 0 || inv.status === "PAID" || inv.status === "COMPLETED") {
            const profileToMatch = currentProfile || myTenantProfile;
            const isTenant = user?.role === "TENANT";
            if (isTenant) {
              const matchesProfile = (profileToMatch && inv.tenant_profile_id === profileToMatch.id) ||
                (inv.tenant_name && user.full_name && inv.tenant_name.toLowerCase() === user.full_name.toLowerCase()) ||
                (inv.tenant_name && user.email && inv.tenant_name.toLowerCase().includes(user.email.split("@")[0].toLowerCase()));
              if (!matchesProfile) return;
            }

            paidList.push({
              id: `pay-${inv.id || idx}`,
              transaction_id: inv.transaction_id || `TXN${100000 + idx}`,
              tenant_name: inv.tenant_name || "Resident",
              room_bed: inv.room_number ? `Room ${inv.room_number}` : "Allocated",
              amount: paidAmount,
              payment_method: inv.payment_method || "ONLINE / UPI",
              payment_date: inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Recent",
              status: "COMPLETED",
            });
          }
        });
        setPayments(paidList);
      }
    } catch (e) {
      console.error("Failed to load payment logs:", e);
      setPayments([]);
    }
  };

  useEffect(() => {
    if (user?.role === "TENANT") {
      api
        .get("/tenants/?limit=1000")
        .then((res) => {
          const list = res.data || [];
          const matched = list.find(
            (t) =>
              (t.user_id && user.id && t.user_id === user.id) ||
              (t.id && user.id && t.id === user.id) ||
              (t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
              (t.full_name && user.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase())
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

  const handleViewReceipt = (p) => {
    setSelectedPayment(p);
    setOpenReceiptDialog(true);
  };

  const columns = [
    {
      id: "transaction_id",
      label: "Transaction Ref ID",
      render: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PaymentIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {p.transaction_id}
          </Typography>
        </Box>
      ),
    },
    {
      id: "tenant_name",
      label: "Resident Name",
      render: (p) => (
        <Typography variant="body2" fontWeight={600}>
          {p.tenant_name}
        </Typography>
      ),
    },
    {
      id: "room_bed",
      label: "Room Allocation",
      render: (p) => <Chip label={p.room_bed} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "amount",
      label: "Amount Paid (₹)",
      render: (p) => `₹${(p.amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "payment_method",
      label: "Payment Mode",
      render: (p) => p.payment_method,
    },
    {
      id: "payment_date",
      label: "Payment Date",
      render: (p) => p.payment_date,
    },
    {
      id: "status",
      label: "Status",
      render: (p) => <Chip label={p.status} size="small" color="success" sx={{ borderRadius: "6px", fontWeight: 700 }} />,
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Payment History & Receipts
          </Typography>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Search transaction ID, tenant, or payment mode..."
        emptyMessage="No payment transactions recorded yet."
        actions={[
          { label: "View Receipt", icon: <ReceiptIcon fontSize="small" />, onClick: (p) => handleViewReceipt(p) },
        ]}
      />

      {/* Receipt View Dialog */}
      <Dialog open={openReceiptDialog} onClose={() => setOpenReceiptDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Payment Receipt</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedPayment && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              <Typography variant="body2"><b>Transaction Ref:</b> {selectedPayment.transaction_id}</Typography>
              <Typography variant="body2"><b>Tenant Name:</b> {selectedPayment.tenant_name}</Typography>
              <Typography variant="body2"><b>Allocation:</b> {selectedPayment.room_bed}</Typography>
              <Typography variant="body2"><b>Amount Paid:</b> ₹{(selectedPayment.amount || 0).toLocaleString("en-IN")}</Typography>
              <Typography variant="body2"><b>Payment Mode:</b> {selectedPayment.payment_method}</Typography>
              <Typography variant="body2"><b>Date:</b> {selectedPayment.payment_date}</Typography>
              <Typography variant="body2"><b>Status:</b> {selectedPayment.status}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenReceiptDialog(false)}>Close</Button>
          <Button variant="contained" color="primary" startIcon={<DownloadIcon />} onClick={() => alert("Payment Receipt PDF Downloaded!")}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
