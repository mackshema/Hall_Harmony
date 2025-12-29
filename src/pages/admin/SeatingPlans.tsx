
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { db, Hall, Department } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shuffle, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SeatingPlans = () => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [generating, setGenerating] = useState(false);
  const [unallocatedStudents, setUnallocatedStudents] = useState<string[]>([]);
  const [showUnallocatedDialog, setShowUnallocatedDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hallsData = await db.getAllHalls();
        setHalls(hallsData);
        
        const deptsData = await db.getAllDepartments();
        setDepartments(deptsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, []);

  const handleViewHall = (hallId: number) => {
    navigate(`/admin/seating-plans/${hallId}`);
  };

  const handleGenerateAllSeatingPlans = async () => {
    // Check if any departments exist
    if (departments.length === 0) {
      toast({
        title: "No Department Added",
        description: "No department added yet. Please add at least one department to generate seating plans.",
        variant: "destructive",
      });
      return;
    }
    
    setGenerating(true);
    try {
      const result = await db.generateAllSeatingPlans();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Seating plans generated for all halls with department alternation.",
        });
        
        if (result.unallocated.length > 0) {
          setUnallocatedStudents(result.unallocated);
          setShowUnallocatedDialog(true);
          
          toast({
            title: "Capacity Warning",
            description: `${result.unallocated.length} students could not be allocated due to insufficient hall capacity.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to generate seating plans. Please ensure halls are configured.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating seating plans:", error);
      toast({
        title: "Error",
        description: "An error occurred while generating seating plans.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const exportConsolidatedPlan = async () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const currentDateTime = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICE OF EXAMINATION CELL", 105, 15, { align: "center" });
      doc.text("CONSOLIDATED HALL PLAN", 105, 22, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date / Session : ${currentDate}`, 105, 29, { align: "center" });
      doc.text(`Generated: ${currentDateTime}`, 105, 34, { align: "center" });
      
      // Get all assignments
      const allAssignments = await db.getAllSeatAssignments();
      
      if (allAssignments.length === 0) {
        toast({
          title: "No Data",
          description: "No seating assignments found. Generate seating plans first.",
          variant: "destructive",
        });
        return;
      }
      
      // Group assignments by hall and department
      const hallGroups: { [hallId: number]: { [deptId: number]: string[] } } = {};
      
      allAssignments.forEach((assignment) => {
        if (!hallGroups[assignment.hallId]) {
          hallGroups[assignment.hallId] = {};
        }
        if (!hallGroups[assignment.hallId][assignment.departmentId]) {
          hallGroups[assignment.hallId][assignment.departmentId] = [];
        }
        hallGroups[assignment.hallId][assignment.departmentId].push(assignment.studentRollNumber);
      });
      
      // Prepare table data
      const tableData: any[] = [];
      
      Object.keys(hallGroups).forEach((hallIdStr) => {
        const hallId = parseInt(hallIdStr);
        const hall = halls.find(h => h.id === hallId);
        const deptGroups = hallGroups[hallId];
        
        Object.keys(deptGroups).forEach((deptIdStr) => {
          const deptId = parseInt(deptIdStr);
          const dept = departments.find(d => d.id === deptId);
          const rollNumbers = deptGroups[deptId].sort();
          
          if (rollNumbers.length > 0) {
            const fromRoll = rollNumbers[0];
            const toRoll = rollNumbers[rollNumbers.length - 1];
            const count = rollNumbers.length;
            
            // Determine floor
            let floor = "GROUND FLOOR";
            if (hall && hall.name.toLowerCase().includes("second")) {
              floor = "SECOND FLOOR";
            } else if (hall && hall.name.toLowerCase().includes("third")) {
              floor = "THIRD FLOOR";
            } else if (hall && hall.name.toLowerCase().includes("first")) {
              floor = "FIRST FLOOR";
            }
            
            tableData.push([
              dept?.name || (deptId === 0 ? "Manual Entry" : "Unknown"),
              fromRoll,
              toRoll,
              count.toString(),
              hall?.name || hallId.toString(),
              floor
            ]);
          }
        });
      });
      
      // Create table
      autoTable(doc, {
        head: [["Dept.", "Reg. No. From", "Reg. No. To", "No. of Candidates", "Hall No", "Floor"]],
        body: tableData,
        startY: 40,
        theme: "grid",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });
      
      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(10);
      doc.text("Examcell Coordinator", 14, finalY + 15);
      
      doc.save(`consolidated-hall-plan-${currentDate.replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Consolidated hall plan exported successfully."
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Seating Plans</h1>
          <p className="text-gray-600">View and manage seating plans for all exam halls</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportConsolidatedPlan}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export Consolidated Plan
          </Button>
          <Button
            onClick={handleGenerateAllSeatingPlans}
            disabled={generating || halls.length === 0}
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Seating Plan"}
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hall Name</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {halls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No exam halls created yet. Create halls to generate seating plans.
                </TableCell>
              </TableRow>
            ) : (
              halls.map(hall => (
                <TableRow key={hall.id}>
                  <TableCell className="font-medium">{hall.name}</TableCell>
                  <TableCell>
                    {hall.rows} rows × {hall.columns} columns, {hall.seatsPerBench} seats per bench
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHall(hall.id)}
                    >
                      View & Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showUnallocatedDialog} onOpenChange={setShowUnallocatedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unallocated Roll Numbers</AlertDialogTitle>
            <AlertDialogDescription>
              The following roll numbers couldn't be allocated due to insufficient space:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto border rounded-md p-4">
            <div className="text-sm space-y-1">
              {unallocatedStudents.map((rollNumber, index) => (
                <div key={index}>{rollNumber}</div>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SeatingPlans;
