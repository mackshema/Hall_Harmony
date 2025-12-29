
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { db, Department, Hall } from "@/lib/db";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rollNumberStart: "",
    rollNumberEnd: ""
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const departmentsData = await db.getAllDepartments();
        setDepartments(departmentsData);
        
        const hallsData = await db.getAllHalls();
        setHalls(hallsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const checkRangeOverlap = (start: string, end: string): Department | null => {
    const newStart = parseInt(start);
    const newEnd = parseInt(end);

    for (const dept of departments) {
      const existingStart = parseInt(dept.rollNumberStart);
      const existingEnd = parseInt(dept.rollNumberEnd);

      // Check if ranges overlap
      if (
        (newStart >= existingStart && newStart <= existingEnd) ||
        (newEnd >= existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        return dept;
      }
    }
    return null;
  };
  
  const handleCreateDepartment = async () => {
    try {
      // Validate inputs
      if (!formData.name || !formData.rollNumberStart || !formData.rollNumberEnd) {
        toast({
          title: "Validation Error",
          description: "Please fill all the fields.",
          variant: "destructive",
        });
        return;
      }

      // Check for overlapping ranges
      const overlappingDept = checkRangeOverlap(formData.rollNumberStart, formData.rollNumberEnd);
      if (overlappingDept) {
        toast({
          title: "⚠️ Duplicate Roll Number Range Detected!",
          description: `This range overlaps with ${overlappingDept.name} (${overlappingDept.rollNumberStart} - ${overlappingDept.rollNumberEnd}).`,
          variant: "destructive",
        });
        return;
      }
      
      const newDepartment = await db.addDepartment(formData);
      setDepartments([...departments, newDepartment]);
      
      toast({
        title: "Department Created",
        description: `${newDepartment.name} has been created successfully.`
      });
      
      // Reset form
      setFormData({
        name: "",
        rollNumberStart: "",
        rollNumberEnd: ""
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Error creating department:", error);
      toast({
        title: "Failed to create department",
        description: "An error occurred while creating the department.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteDepartment = async (departmentId: number) => {
    try {
      await db.deleteDepartment(departmentId);
      setDepartments(departments.filter(dept => dept.id !== departmentId));
      
      toast({
        title: "Department Deleted",
        description: "The department has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting department:", error);
      toast({
        title: "Failed to delete department",
        description: "An error occurred while deleting the department.",
        variant: "destructive",
      });
    }
  };

  const exportHallAllocation = async () => {
    try {
      const doc = new jsPDF();
      const currentDateTime = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.setFontSize(18);
      doc.text("Hall Allocation Report", 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDateTime}`, 14, 30);
      
      // Get seat assignments for all halls
      const allocationData: any[] = [];
      
      for (const hall of halls) {
        const assignments = await db.getHallSeatAssignments(hall.id);
        
        // Group by department
        const deptMap: { [deptId: number]: { dept: Department | undefined, rollNumbers: string[] } } = {};
        
        assignments.forEach(assignment => {
          if (!deptMap[assignment.departmentId]) {
            const dept = departments.find(d => d.id === assignment.departmentId);
            deptMap[assignment.departmentId] = {
              dept,
              rollNumbers: []
            };
          }
          deptMap[assignment.departmentId].rollNumbers.push(assignment.studentRollNumber);
        });
        
        // Add to table data
        Object.values(deptMap).forEach(({ dept, rollNumbers }) => {
          if (dept && rollNumbers.length > 0) {
            rollNumbers.sort();
            allocationData.push([
              dept.name,
              `${rollNumbers[0]} to ${rollNumbers[rollNumbers.length - 1]}`,
              hall.name
            ]);
          }
        });
      }
      
      if (allocationData.length === 0) {
        toast({
          title: "No Data",
          description: "No hall allocations found. Generate seating plans first.",
          variant: "destructive",
        });
        return;
      }
      
      autoTable(doc, {
        startY: 40,
        head: [["Department", "Roll Number Range", "Hall Number"]],
        body: allocationData,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      doc.save(`hall-allocation-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Hall allocation report has been exported successfully."
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Departments Management</h1>
          <p className="text-gray-600">Add and manage departments and roll number ranges</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportHallAllocation}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Hall Allocation
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
                <DialogDescription>
                  Ensure roll number ranges don't overlap with existing departments
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Department Name</Label>
                  <Input
                    id="name"
                    name="name" 
                    placeholder="e.g., Computer Science"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rollNumberStart">Roll Number Range Start</Label>
                  <Input
                    id="rollNumberStart"
                    name="rollNumberStart" 
                    placeholder="e.g., 911123149001"
                    value={formData.rollNumberStart}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rollNumberEnd">Roll Number Range End</Label>
                  <Input
                    id="rollNumberEnd"
                    name="rollNumberEnd" 
                    placeholder="e.g., 911123149048"
                    value={formData.rollNumberEnd}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDepartment}>Add Department</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department Name</TableHead>
              <TableHead>Roll Number Range</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No departments added yet. Add your first department to get started.
                </TableCell>
              </TableRow>
            ) : (
              departments.map(department => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>
                    {department.rollNumberStart} – {department.rollNumberEnd}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDepartment(department.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DepartmentsManagement;
