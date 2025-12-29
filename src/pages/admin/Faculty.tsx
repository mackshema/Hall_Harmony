
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
import { db, Hall, User } from "@/lib/db";
import { toast } from "@/components/ui/use-toast";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FacultyManagement = () => {
  const [faculty, setFaculty] = useState<User[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const facultyData = await db.getAllFaculty();
        setFaculty(facultyData);
        
        const hallsData = await db.getAllHalls();
        setHalls(hallsData);
      } catch (error) {
        console.error("Error fetching faculty data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Function to get assigned halls for each faculty member
  const getAssignedHalls = (facultyId: number): Hall[] => {
    return halls.filter(hall => 
      hall.facultyAssigned && hall.facultyAssigned.includes(facultyId)
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddFaculty = async () => {
    try {
      if (!formData.name || !formData.department) {
        toast({
          title: "Validation Error",
          description: "Please fill all the fields.",
          variant: "destructive",
        });
        return;
      }

      // Generate credentials
      const cleanName = formData.name.toLowerCase().replace(/\s+/g, '');
      const username = `${cleanName}@1234`;
      const password = `${cleanName}@srm1234`;

      const newFaculty = await db.addFaculty({
        name: formData.name,
        username: username,
        password: password,
        role: 'faculty',
        department: formData.department,
      });

      setFaculty([...faculty, newFaculty]);

      toast({
        title: "Faculty Added",
        description: `${newFaculty.name} has been added successfully.\nUsername: ${username}\nPassword: ${password}`,
      });

      setFormData({ name: "", department: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error adding faculty:", error);
      toast({
        title: "Failed to add faculty",
        description: "An error occurred while adding the faculty member.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFaculty = async (facultyId: number) => {
    try {
      await db.deleteFaculty(facultyId);
      setFaculty(faculty.filter(f => f.id !== facultyId));

      toast({
        title: "Faculty Deleted",
        description: "The faculty member has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting faculty:", error);
      toast({
        title: "Failed to delete faculty",
        description: "An error occurred while deleting the faculty member.",
        variant: "destructive",
      });
    }
  };

  const exportFacultyHallAllocation = () => {
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
      doc.text("Faculty-Hall Allocation Report", 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDateTime}`, 14, 30);
      
      const tableData = faculty.map(member => {
        const assignedHalls = getAssignedHalls(member.id);
        return [
          member.name,
          member.department || "N/A",
          assignedHalls.length > 0 
            ? assignedHalls.map(h => h.name).join(", ") 
            : "None"
        ];
      });
      
      autoTable(doc, {
        startY: 40,
        head: [["Faculty Name", "Department", "Assigned Halls"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      doc.save(`faculty-hall-allocation-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Faculty-Hall allocation has been exported to PDF successfully."
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

  if (loading) {
    return <div className="p-8 text-center">Loading faculty data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Faculty Management</h1>
          <p className="text-gray-600">View faculty members and their assigned exam halls</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportFacultyHallAllocation}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Allocation
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Faculty</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Faculty</DialogTitle>
                <DialogDescription>
                  Login credentials will be auto-generated based on the name
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Faculty Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="e.g., Computer Science"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
                {formData.name && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-semibold mb-1">Auto-generated Credentials:</p>
                    <p>Username: {formData.name.toLowerCase().replace(/\s+/g, '')}@1234</p>
                    <p>Password: {formData.name.toLowerCase().replace(/\s+/g, '')}@srm1234</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddFaculty}>Add Faculty</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Assigned Halls</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculty.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No faculty members found.
                </TableCell>
              </TableRow>
            ) : (
              faculty.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.department || "N/A"}</TableCell>
                  <TableCell>{member.username}</TableCell>
                  <TableCell>
                    {getAssignedHalls(member.id).length > 0 ? (
                      <ul className="list-disc pl-5">
                        {getAssignedHalls(member.id).map(hall => (
                          <li key={hall.id}>{hall.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500 italic">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFaculty(member.id)}
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
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Note:</h3>
        <p className="text-gray-600">
          Faculty members can be assigned to halls when creating or editing an exam hall. 
          Each faculty member can view the seating plans for their assigned halls when they log in.
        </p>
      </div>
    </div>
  );
};

export default FacultyManagement;
