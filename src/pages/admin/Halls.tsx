
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
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
import { db, Hall, User } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HallsManagement = () => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rows: 5,
    columns: 5,
    seatsPerBench: 3,
    facultyAssigned: [] as number[],
    floor: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hallsData = await db.getAllHalls();
        setHalls(hallsData);
        
        const facultyData = await db.getAllFaculty();
        setFaculty(facultyData);
      } catch (error) {
        console.error("Error fetching halls:", error);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'name' ? value : parseInt(value, 10)
    });
  };
  
  const handleFacultyChange = (facultyId: string) => {
    setFormData({
      ...formData,
      facultyAssigned: [parseInt(facultyId, 10)]
    });
  };
  
  const handleFloorChange = (floor: string) => {
    setFormData({
      ...formData,
      floor
    });
  };

  const handleCreateHall = async () => {
    try {
      // Validate inputs
      if (
        !formData.name || 
        formData.rows < 1 || 
        formData.columns < 1 || 
        formData.seatsPerBench < 1 ||
        formData.facultyAssigned.length === 0 ||
        !formData.floor
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill all the fields with valid values.",
          variant: "destructive",
        });
        return;
      }
      
      // Check faculty assignment across all halls
      const selectedFacultyId = formData.facultyAssigned[0];
      const selectedFaculty = faculty.find(f => f.id === selectedFacultyId);
      
      if (selectedFaculty && selectedFaculty.department) {
        const facultyInSameDept = faculty.filter(f => f.department === selectedFaculty.department);
        const assignedFacultyInDept = halls
          .filter(h => h.facultyAssigned && h.facultyAssigned.length > 0)
          .flatMap(h => h.facultyAssigned)
          .map(fId => faculty.find(f => f.id === fId))
          .filter(f => f && f.department === selectedFaculty.department);
        
        if (assignedFacultyInDept.length >= 2) {
          toast({
            title: "Faculty Assignment Notice",
            description: `Two faculty from ${selectedFaculty.department} department are already assigned. You may still continue if needed.`,
            duration: 5000,
          });
        }
      }
      
      const newHall = await db.addHall(formData);
      setHalls([...halls, newHall]);
      
      toast({
        title: "Hall Created",
        description: `${newHall.name} has been created successfully.`
      });
      
      // Reset form
      setFormData({
        name: "",
        rows: 5,
        columns: 5,
        seatsPerBench: 3,
        facultyAssigned: [],
        floor: ""
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Error creating hall:", error);
      toast({
        title: "Failed to create hall",
        description: "An error occurred while creating the hall.",
        variant: "destructive",
      });
    }
  };
  
  const handleViewHall = (hallId: number) => {
    navigate(`/admin/seating-plans/${hallId}`);
  };
  
  const handleDeleteHall = async (hallId: number) => {
    try {
      await db.deleteHall(hallId);
      setHalls(halls.filter(hall => hall.id !== hallId));
      
      toast({
        title: "Hall Deleted",
        description: "The hall has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting hall:", error);
      toast({
        title: "Failed to delete hall",
        description: "An error occurred while deleting the hall.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Exam Halls Management</h1>
          <p className="text-gray-600">Manage your exam halls here</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create New Hall</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exam Hall</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Hall Name</Label>
                <Input
                  id="name"
                  name="name" 
                  placeholder="Enter hall name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rows">Rows</Label>
                  <Input
                    id="rows"
                    name="rows"
                    type="number" 
                    min="1"
                    value={formData.rows}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="columns">Columns</Label>
                  <Input
                    id="columns"
                    name="columns"
                    type="number"
                    min="1" 
                    value={formData.columns}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="seatsPerBench">Seats Per Bench</Label>
                  <Input
                    id="seatsPerBench"
                    name="seatsPerBench"
                    type="number"
                    min="1" 
                    value={formData.seatsPerBench}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floor">Floor</Label>
                <Select
                  onValueChange={handleFloorChange}
                  value={formData.floor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Ground Floor">Ground Floor</SelectItem>
                    <SelectItem value="First Floor">First Floor</SelectItem>
                    <SelectItem value="Second Floor">Second Floor</SelectItem>
                    <SelectItem value="Third Floor">Third Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faculty">Assign Faculty</Label>
                <Select
                  onValueChange={handleFacultyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {faculty.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateHall}>Create Hall</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead>Faculty Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {halls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No exam halls created yet. Create your first hall to get started.
                </TableCell>
              </TableRow>
            ) : (
              halls.map(hall => (
                <TableRow key={hall.id}>
                  <TableCell className="font-medium">{hall.name}</TableCell>
                  <TableCell>
                    {hall.rows} rows × {hall.columns} columns, {hall.seatsPerBench} seats per bench
                  </TableCell>
                  <TableCell>
                    {hall.facultyAssigned && hall.facultyAssigned.length > 0
                      ? faculty
                          .filter(f => hall.facultyAssigned.includes(f.id))
                          .map(f => f.name)
                          .join(", ")
                      : "None"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHall(hall.id)}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteHall(hall.id)}
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

export default HallsManagement;
