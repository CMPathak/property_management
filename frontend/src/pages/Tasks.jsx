import React, { useState } from "react";
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
import { Add as AddIcon, Assignment as TaskIcon, CheckCircle as CheckIcon } from "@mui/icons-material";
import DataTable from "../components/common/DataTable";

export default function Tasks() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Plumbing Inspection - Room 101", category: "Maintenance", assigned_to: "Rahul Sharma", priority: "HIGH", status: "PENDING", due_date: "2026-07-25" },
    { id: 2, title: "Deep Cleaning - Floor 2 Common Area", category: "Housekeeping", assigned_to: "Sunil Verma", priority: "MEDIUM", status: "IN_PROGRESS", due_date: "2026-07-24" },
    { id: 3, title: "AC Filter Replacement - Room 204", category: "Appliance", assigned_to: "Rahul Sharma", priority: "URGENT", status: "COMPLETED", due_date: "2026-07-23" },
  ]);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("Maintenance");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split("T")[0]);

  const handleAddTask = () => {
    if (!taskTitle) {
      alert("Please enter a task title.");
      return;
    }
    const newTask = {
      id: Date.now(),
      title: taskTitle,
      category: taskCategory,
      assigned_to: taskAssignee || "Assigned Staff",
      priority: taskPriority,
      status: "PENDING",
      due_date: taskDueDate,
    };
    setTasks([newTask, ...tasks]);
    setOpenAddDialog(false);
    setTaskTitle("");
    setTaskAssignee("");
  };

  const handleToggleTaskStatus = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === "COMPLETED" ? "PENDING" : t.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const columns = [
    {
      id: "title",
      label: "Task Title",
      render: (t) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TaskIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700}>
            {t.title}
          </Typography>
        </Box>
      ),
    },
    {
      id: "category",
      label: "Category",
      render: (t) => <Chip label={t.category} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "assigned_to",
      label: "Assigned Staff",
      render: (t) => (
        <Typography variant="body2" fontWeight={600}>
          {t.assigned_to}
        </Typography>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      render: (t) => (
        <Chip
          label={t.priority}
          size="small"
          color={t.priority === "URGENT" || t.priority === "HIGH" ? "error" : "warning"}
          sx={{ borderRadius: "6px", fontWeight: 700 }}
        />
      ),
    },
    {
      id: "due_date",
      label: "Due Date",
      render: (t) => t.due_date,
    },
    {
      id: "status",
      label: "Status",
      render: (t) => {
        const isDone = t.status === "COMPLETED";
        return (
          <Chip
            label={t.status}
            size="small"
            onClick={() => handleToggleTaskStatus(t.id)}
            sx={{
              fontWeight: 700,
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: isDone ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: isDone ? "#16A34A" : "#D97706",
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
            My Work Tasks
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
          Create Task
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={tasks}
        searchPlaceholder="Search task title, category, or staff..."
        emptyMessage="No assigned tasks found."
        actions={[
          { label: "Update Status", icon: <CheckIcon fontSize="small" />, onClick: (t) => handleToggleTaskStatus(t.id) },
        ]}
      />

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Task</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField label="Task Title" fullWidth value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="cat-select">Category</InputLabel>
            <Select labelId="cat-select" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} label="Category">
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Housekeeping">Housekeeping</MenuItem>
              <MenuItem value="Appliance">Appliance</MenuItem>
              <MenuItem value="Inspection">Inspection</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Assigned Staff Name" fullWidth value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="pri-select">Priority</InputLabel>
            <Select labelId="pri-select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} label="Priority">
              <MenuItem value="LOW">LOW</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="URGENT">URGENT</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Due Date" type="date" fullWidth value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" color="primary">
            Save Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
