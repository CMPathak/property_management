import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Description as InvoiceIcon,
  GetApp as DownloadIcon,
  CurrencyRupee as RupeeIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";

// Normalise invoice object to ensure consistent field names
const normaliseInvoice = (inv) => ({
  ...inv,
  invoice_number: inv.invoice_number || inv.invoice_no || inv.id || "—",
  billing_period_start:
    inv.billing_period_start ||
    (inv.billing_start_date
      ? new Date(inv.billing_start_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—"),
  billing_period_end:
    inv.billing_period_end ||
    (inv.billing_end_date
      ? new Date(inv.billing_end_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—"),
  due_date: inv.due_date
    ? inv.due_date.includes("-")
      ? new Date(inv.due_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : inv.due_date
    : "—",
});

export default function Invoices() {
  const rawUser = useSelector((state) => state.auth.user);
  const isTenant = rawUser?.role === "TENANT";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await api.get("/rent/invoices");
        const all = (res.data || []).map(normaliseInvoice);

        if (isTenant && rawUser) {
          // Tenants see only their own invoices matched by tenant_id, name or email
          const filtered = all.filter(
            (inv) =>
              (rawUser.id && inv.tenant_id === rawUser.id) ||
              (inv.tenant_name &&
                rawUser.full_name &&
                inv.tenant_name.toLowerCase() ===
                  rawUser.full_name.toLowerCase()) ||
              (inv.tenant_name &&
                rawUser.email &&
                inv.tenant_name
                  .toLowerCase()
                  .includes(rawUser.email.split("@")[0].toLowerCase()))
          );

          // If tenant_id matching didn't work directly, also try via tenant profiles
          if (filtered.length === 0) {
            try {
              const profileRes = await api.get("/tenants/?limit=1000");
              const profiles = profileRes.data || [];
              const myProfile = profiles.find(
                (t) =>
                  (t.user_id && rawUser.id && t.user_id === rawUser.id) ||
                  (t.email &&
                    rawUser.email &&
                    t.email.toLowerCase() === rawUser.email.toLowerCase()) ||
                  (t.full_name &&
                    rawUser.full_name &&
                    t.full_name.toLowerCase() ===
                      rawUser.full_name.toLowerCase())
              );
              if (myProfile) {
                const profileFiltered = all.filter(
                  (inv) =>
                    inv.tenant_id === myProfile.id ||
                    inv.tenant_profile_id === myProfile.id
                );
                setInvoices(profileFiltered);
              } else {
                setInvoices([]);
              }
            } catch {
              setInvoices([]);
            }
          } else {
            setInvoices(filtered);
          }
        } else {
          // Admins and owners see all invoices
          setInvoices(all);
        }
      } catch (e) {
        console.error("Failed to fetch invoices:", e);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [rawUser]);

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setOpenDialog(true);
  };

  const handleDownloadPDF = (inv) => {
    const id = inv.id;
    window.open(
      `http://localhost:8000/api/v1/rent/invoices/${id}/download`,
      "_blank"
    );
  };

  const columns = [
    {
      id: "invoice_number",
      label: "Invoice No.",
      render: (inv) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InvoiceIcon sx={{ color: "#2563EB", fontSize: 20 }} />
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {inv.invoice_number}
          </Typography>
        </Box>
      ),
    },
    // Show tenant name column only for admins
    ...(!isTenant
      ? [
          {
            id: "tenant_name",
            label: "Tenant Name",
            render: (inv) => (
              <Typography variant="body2" fontWeight={600}>
                {inv.tenant_name || "—"}
              </Typography>
            ),
          },
        ]
      : []),
    {
      id: "room_number",
      label: "Room Allocation",
      render: (inv) => (
        <Chip
          label={inv.room_number || "—"}
          size="small"
          variant="outlined"
          color="primary"
          sx={{ borderRadius: "6px" }}
        />
      ),
    },
    {
      id: "billing_period",
      label: "Billing Period",
      render: (inv) =>
        `${inv.billing_period_start} – ${inv.billing_period_end}`,
    },
    {
      id: "rent_amount",
      label: "Rent (₹)",
      render: (inv) =>
        `₹${(inv.rent_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "security_deposit",
      label: "Security (₹)",
      render: (inv) =>
        `₹${(inv.security_deposit || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "total_amount",
      label: "Total Bill (₹)",
      render: (inv) =>
        `₹${(inv.total_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "due_date",
      label: "Due Date",
      render: (inv) => (
        <Typography
          variant="body2"
          fontWeight={600}
          color={inv.status === "PAID" ? "#10B981" : "#EF4444"}
        >
          {inv.due_date}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (inv) => {
        const isPaid = inv.status === "PAID" || inv.status === "COMPLETED";
        const isPartial = inv.status === "PARTIALLY_PAID";
        return (
          <Chip
            label={inv.status || "UNPAID"}
            size="small"
            color={isPaid ? "success" : isPartial ? "warning" : "error"}
            sx={{ borderRadius: "6px", fontWeight: 700, fontSize: "0.72rem" }}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            {isTenant ? "My Invoices" : "Invoices Roster"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isTenant
              ? "Your billing invoices, rent & security deposit breakdowns, and payment statuses."
              : "Generated billing invoices, rent breakdowns, security deposits, and payment due statuses."}
          </Typography>
        </Box>
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress size={36} sx={{ color: "#2563EB" }} />
          <Typography variant="body2" color="#64748B" sx={{ ml: 2 }}>
            Loading invoices…
          </Typography>
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          searchPlaceholder={
            isTenant
              ? "Search invoice number or status…"
              : "Search invoice number, tenant, or room…"
          }
          emptyMessage={
            isTenant
              ? "No invoices found for your account."
              : "No invoices generated yet."
          }
          actions={[
            {
              label: "View Details",
              icon: <InvoiceIcon fontSize="small" />,
              onClick: (inv) => handleViewInvoice(inv),
            },
            {
              label: "Download PDF",
              icon: <DownloadIcon fontSize="small" />,
              onClick: (inv) => handleDownloadPDF(inv),
            },
          ]}
        />
      )}

      {/* Invoice Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0" }}>
          Invoice Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedInvoice && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Invoice No.</Typography>
                <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedInvoice.invoice_number}</Typography>
              </Box>

              {!isTenant && (
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="#64748B" fontWeight={500}>Tenant Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedInvoice.tenant_name || "—"}</Typography>
                </Box>
              )}

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Room & Bed</Typography>
                <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedInvoice.room_number || "—"}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Billing Period</Typography>
                <Typography variant="body2" fontWeight={700} color="#0F172A">
                  {selectedInvoice.billing_period_start} – {selectedInvoice.billing_period_end}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Due Date</Typography>
                <Typography variant="body2" fontWeight={700} color="#EF4444">{selectedInvoice.due_date}</Typography>
              </Box>

              <Divider sx={{ my: 0.5, borderColor: "#E2E8F0" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Base Rent</Typography>
                <Typography variant="body2" fontWeight={700} color="#0F172A">₹{(selectedInvoice.rent_amount || 0).toLocaleString("en-IN")}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Security Deposit</Typography>
                <Typography variant="body2" fontWeight={700} color="#0F172A">₹{(selectedInvoice.security_deposit || 0).toLocaleString("en-IN")}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Amount Paid</Typography>
                <Typography variant="body2" fontWeight={700} color="#10B981">₹{(selectedInvoice.paid_amount || 0).toLocaleString("en-IN")}</Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  p: 1.5,
                  bgcolor: "#EFF6FF",
                  borderRadius: "10px",
                  border: "1px solid #BFDBFE",
                  mt: 0.5,
                }}
              >
                <Typography variant="body2" fontWeight={800} color="#1E40AF">Total Payable</Typography>
                <Typography variant="body2" fontWeight={800} color="#2563EB">
                  ₹{(selectedInvoice.total_amount || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="#64748B" fontWeight={500}>Status</Typography>
                <Chip
                  label={selectedInvoice.status || "UNPAID"}
                  size="small"
                  color={
                    selectedInvoice.status === "PAID" || selectedInvoice.status === "COMPLETED"
                      ? "success"
                      : selectedInvoice.status === "PARTIALLY_PAID"
                      ? "warning"
                      : "error"
                  }
                  sx={{ borderRadius: "6px", fontWeight: 700 }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: "#64748B", textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadPDF(selectedInvoice)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
