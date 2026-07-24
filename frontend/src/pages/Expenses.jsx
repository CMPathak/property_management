import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Chip,
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
import { Add as AddIcon, ReceiptLong as ExpenseIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";

export default function Expenses() {
  const [expenses, setExpenses] = useState([
    { id: 1, title: "Electricity Bill - Main Property", category: "UTILITY", amount: 14200, date: "2026-07-20", payment_method: "ONLINE", status: "PAID" },
    { id: 2, title: "Water Supply Bill", category: "UTILITY", amount: 3500, date: "2026-07-18", payment_method: "BANK_TRANSFER", status: "PAID" },
    { id: 3, title: "Plumbing Parts & Repair", category: "MAINTENANCE", amount: 2800, date: "2026-07-15", payment_method: "CASH", status: "PAID" },
  ]);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [amount, setAmount] = useState("");
  const [payMethod, setPayMethod] = useState("ONLINE");

  const fetchData = async () => {
    try {
      const res = await api.get("/expenses/");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setExpenses(res.data);
      }
    } catch (e) {
      console.log("Using initial expense records.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async () => {
    if (!title || !amount) {
      alert("Please provide title and amount.");
      return;
    }
    const newExp = {
      id: Date.now(),
      title,
      category,
      amount: parseFloat(amount) || 0,
      date: new Date().toISOString().split("T")[0],
      payment_method: payMethod,
      status: "PAID",
    };
    setExpenses([newExp, ...expenses]);
    setOpenAddDialog(false);
    setTitle("");
    setAmount("");
  };

  const columns = [
    {
      id: "title",
      label: "Expense Title / Description",
      render: (e) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ExpenseIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700}>
            {e.title}
          </Typography>
        </Box>
      ),
    },
    {
      id: "category",
      label: "Category",
      render: (e) => <Chip label={e.category} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "amount",
      label: "Amount (₹)",
      render: (e) => `₹${(e.amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "date",
      label: "Expense Date",
      render: (e) => e.date,
    },
    {
      id: "payment_method",
      label: "Payment Mode",
      render: (e) => e.payment_method,
    },
    {
      id: "status",
      label: "Status",
      render: (e) => <Chip label={e.status || "PAID"} size="small" color="success" sx={{ borderRadius: "6px", fontWeight: 700 }} />,
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Expense Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track utility bills, property repairs, maintenance costs, and operational payouts.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
          Add Expense
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={expenses}
        searchPlaceholder="Search expense title, category, or payment mode..."
        emptyMessage="No recorded expenses yet."
      />

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Record New Expense</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField label="Expense Description" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="exp-cat">Expense Category</InputLabel>
            <Select labelId="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)} label="Expense Category">
              <MenuItem value="UTILITY">UTILITY (Electricity / Water)</MenuItem>
              <MenuItem value="MAINTENANCE">MAINTENANCE (Repairs / Plumbing)</MenuItem>
              <MenuItem value="SALARY">SALARY (Staff Payouts)</MenuItem>
              <MenuItem value="OTHER">OTHER (Miscellaneous)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Amount (₹)" type="number" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel id="exp-mode">Payment Method</InputLabel>
            <Select labelId="exp-mode" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} label="Payment Method">
              <MenuItem value="ONLINE">ONLINE / UPI</MenuItem>
              <MenuItem value="BANK_TRANSFER">BANK TRANSFER</MenuItem>
              <MenuItem value="CASH">CASH</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddExpense} variant="contained" color="primary">
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
