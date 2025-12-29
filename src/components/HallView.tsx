import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, Hall, Department, SeatAssignment } from "@/lib/db";
import { toast } from "@/components/ui/use-toast";
import { useExam } from "@/context/ExamContext";
import exportTableAsDoc from "@/lib/exportWord";
import { exportBenchLayoutWordDoc } from "@/lib/exportBenchLayoutWord";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileDown, Plus } from "lucide-react";

interface HallViewProps {
  hallId: number;
  readOnly?: boolean;
}

interface StudentSeat {
  row: number;
  column: number;
  benchPosition: number;
  rollNumber: string;
  departmentId?: number;
  departmentName?: string;
}

const HallView: React.FC<HallViewProps> = ({ hallId, readOnly = false }) => {
  const [hall, setHall] = useState<Hall | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [seats, setSeats] = useState<StudentSeat[][]>([]);
  const [loading, setLoading] = useState(true);
  const [skipRollNumbers, setSkipRollNumbers] = useState<string[]>([]);
  const [skipInput, setSkipInput] = useState("");
  const [unallocatedRollNumbers, setUnallocatedRollNumbers] = useState<string[]>([]);
  const [showUnallocatedDialog, setShowUnallocatedDialog] = useState(false);
  const [showManualAddDialog, setShowManualAddDialog] = useState(false);
  const [manualRollNumbers, setManualRollNumbers] = useState<string[]>([]);
  const [manualRollInput, setManualRollInput] = useState("");
  const { examDate, examTime, examSession } = useExam();

  useEffect(() => {
    const fetchHallDetails = async () => {
      try {
        const hallData = await db.getHallById(hallId);
        if (hallData) {
          setHall(hallData);

          const existingAssignments = await db.getHallSeatAssignments(hallId);

          const departmentsData = await db.getAllDepartments();
          setDepartments(departmentsData);

          const initialSeats = Array(hallData.rows).fill(null).map(() =>
            Array(hallData.columns * hallData.seatsPerBench).fill(null).map(() => ({
              row: 0,
              column: 0,
              benchPosition: 0,
              rollNumber: "",
              departmentId: undefined,
              departmentName: undefined
            }))
          );

          if (existingAssignments.length > 0) {
            existingAssignments.forEach(assignment => {
              const deptInfo = departmentsData.find(d => d.id === assignment.departmentId);
              const rowIndex = assignment.row - 1;
              const colIndex = (assignment.column - 1) * hallData.seatsPerBench + (assignment.benchPosition - 1);

              if (rowIndex >= 0 && rowIndex < initialSeats.length && colIndex >= 0 && colIndex < initialSeats[0].length) {
                initialSeats[rowIndex][colIndex] = {
                  row: assignment.row,
                  column: assignment.column,
                  benchPosition: assignment.benchPosition,
                  rollNumber: assignment.studentRollNumber,
                  departmentId: assignment.departmentId,
                  departmentName: deptInfo?.name
                };
              }
            });
          }

          setSeats(initialSeats);
        }
      } catch (error) {
        console.error("Error fetching hall details:", error);
        toast({
          title: "Error",
          description: "Failed to load hall details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHallDetails();
  }, [hallId]);

  const generateSeatingPlan = async () => {
    if (!hall) {
      toast({
        title: "Cannot Generate Seating Plan",
        description: "Hall information not found.",
        variant: "destructive",
      });
      return;
    }

    if (departments.length === 0) {
      toast({
        title: "No Department Added",
        description: "No department added yet. Please add at least one department to generate seating plans.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await db.generateHallSeatingPlan(hall.id, skipRollNumbers, manualRollNumbers);

      if (result.success) {
        // Reload the seating assignments
        const existingAssignments = await db.getHallSeatAssignments(hall.id);
        const departmentsData = await db.getAllDepartments();

        const newSeats = Array(hall.rows).fill(null).map(() =>
          Array(hall.columns * hall.seatsPerBench).fill(null).map(() => ({
            row: 0,
            column: 0,
            benchPosition: 0,
            rollNumber: "",
            departmentId: undefined,
            departmentName: undefined
          }))
        );

        existingAssignments.forEach(assignment => {
          const deptInfo = departmentsData.find(d => d.id === assignment.departmentId);
          const rowIndex = assignment.row - 1;
          const colIndex = (assignment.column - 1) * hall.seatsPerBench + (assignment.benchPosition - 1);

          if (rowIndex >= 0 && rowIndex < newSeats.length && colIndex >= 0 && colIndex < newSeats[0].length) {
            newSeats[rowIndex][colIndex] = {
              row: assignment.row,
              column: assignment.column,
              benchPosition: assignment.benchPosition,
              rollNumber: assignment.studentRollNumber,
              departmentId: assignment.departmentId,
              departmentName: deptInfo?.name
            };
          }
        });

        setSeats(newSeats);

        // Show warnings and unallocated students
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning, index) => {
            // Check if this is the missing numbers warning
            const isMissingNumbersWarning = warning.toLowerCase().includes('missing') || warning.toLowerCase().includes('seat numbers');

            toast({
              title: isMissingNumbersWarning ? "Missing Roll Numbers" : "Warning",
              description: warning,
              variant: isMissingNumbersWarning ? "default" : "destructive",
              duration: 5000,
            });
          });
        }

        if (result.unallocated.length > 0) {
          setUnallocatedRollNumbers(result.unallocated);
          setShowUnallocatedDialog(true);
        } else {
          toast({
            title: "Success",
            description: "Seating plan generated successfully with department alternation.",
            duration: 3000,
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to generate seating plan.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating seating plan:", error);
      toast({
        title: "Error",
        description: "An error occurred while generating the seating plan.",
        variant: "destructive",
      });
    }
  };

  const exportConsolidatedWord = async () => {
    if (!hall) return;

    try {
      // Group seats by department
      const deptGroups: { [deptId: number]: string[] } = {};

      for (let r = 0; r < hall.rows; r++) {
        for (let c = 0; c < hall.columns; c++) {
          for (let s = 0; s < hall.seatsPerBench; s++) {
            const seatIndex = c * hall.seatsPerBench + s;
            const seat = seats[r][seatIndex];

            if (seat?.rollNumber && seat.departmentId !== undefined) {
              if (!deptGroups[seat.departmentId]) {
                deptGroups[seat.departmentId] = [];
              }
              deptGroups[seat.departmentId].push(seat.rollNumber);
            }
          }
        }
      }

      const tableData: (string | number)[][] = [];

      Object.keys(deptGroups).forEach((deptIdStr) => {
        const deptId = parseInt(deptIdStr);
        const dept = departments.find(d => d.id === deptId);
        const rollNumbers = deptGroups[deptId].sort(
          (a, b) => parseInt(a) - parseInt(b)
        );

        if (rollNumbers.length > 0) {
          const fromRoll = rollNumbers[0];
          const toRoll = rollNumbers[rollNumbers.length - 1];
          const count = rollNumbers.length;

          let floor = hall.floor || "GROUND FLOOR";
          if (!hall.floor) {
            if (hall.name.toLowerCase().includes("second")) floor = "SECOND FLOOR";
            else if (hall.name.toLowerCase().includes("third")) floor = "THIRD FLOOR";
            else if (hall.name.toLowerCase().includes("first")) floor = "FIRST FLOOR";
          }

          tableData.push([
            dept?.name || (deptId === 0 ? "Manual Entry" : "Unknown"),
            fromRoll,
            toRoll,
            count,
            hall.name,
            floor,
            `${examDate} | ${examSession} | ${examTime}`,
          ]);
        }
      });

      if (tableData.length === 0) {
        toast({
          title: "No Data",
          description: "No seating data available to export.",
          variant: "destructive",
        });
        return;
      }

      await exportTableAsDoc({
        filename: `${hall.name}-consolidated-plan.docx`,
        title: "OFFICE OF EXAMINATION CELL\nCONSOLIDATED HALL PLAN",
        generatedOn: `Date / Session : ${examDate} | ${examSession} | ${examTime}`,
        headers: [
          "Dept.",
          "Reg. No. From",
          "Reg. No. To",
          "No. of Candidates",
          "Hall No",
          "Floor",
          "Exam Info",
        ],
        rows: tableData,
        footerText: "Examcell Coordinator",
      });

      toast({
        title: "Word Exported",
        description: "Consolidated hall plan exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting to Word:", error);
      toast({
        title: "Error",
        description: "Failed to export seating plan to Word.",
        variant: "destructive",
      });
    }
  };


  const exportBenchLayout = () => {
    if (!hall) return;

    try {
      // Use A3 landscape for more space
      const doc = new jsPDF('landscape', 'mm', 'a3');
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
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SRM MADURAI", 210, 15, { align: "center" });
      doc.setFontSize(14);
      doc.text("COLLEGE FOR ENGINEERING AND TECHNOLOGY", 210, 22, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai", 210, 28, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXAMINATION CELL", 210, 38, { align: "center" });

      doc.setFontSize(11);
      doc.text("ACADEMIC YEAR 2025-2026 (ODD SEMESTER)", 210, 45, { align: "center" });
      doc.text("INTERNAL ASSESSMENT TEST – II (Except I Year)", 210, 51, { align: "center" });
      doc.text("SEATING ARRANGEMENT", 210, 57, { align: "center" });

      // Hall number and date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Hall No: ${hall.name}`, 14, 68);
      doc.text(`Date: ${examDate} (${examSession}) ${examTime}`, 370, 68);

      // Group seats by department for summary table
      const deptGroups: { [deptId: number]: string[] } = {};

      for (let r = 0; r < hall.rows; r++) {
        for (let c = 0; c < hall.columns; c++) {
          for (let s = 0; s < hall.seatsPerBench; s++) {
            const seatIndex = c * hall.seatsPerBench + s;
            const seat = seats[r]?.[seatIndex];

            if (seat?.rollNumber && seat.departmentId !== undefined) {
              if (!deptGroups[seat.departmentId]) {
                deptGroups[seat.departmentId] = [];
              }
              deptGroups[seat.departmentId].push(seat.rollNumber);
            }
          }
        }
      }

      // Create department summary table
      const summaryData: any[] = [];
      let totalCount = 0;

      Object.keys(deptGroups).forEach((deptIdStr) => {
        const deptId = parseInt(deptIdStr);
        const dept = departments.find(d => d.id === deptId);
        const rollNumbers = deptGroups[deptId].sort((a, b) => parseInt(a) - parseInt(b));

        if (rollNumbers.length > 0) {
          const fromRoll = rollNumbers[0];
          const toRoll = rollNumbers[rollNumbers.length - 1];
          const count = rollNumbers.length;
          totalCount += count;

          summaryData.push([
            dept?.name || (deptId === 0 ? "Manual Entry" : "Unknown"),
            fromRoll,
            toRoll,
            count.toString(),
            "", // Present column - empty
            "", // Absent column - empty
            ""  // Absentees Reg No - empty
          ]);
        }
      });

      // Add total row
      if (summaryData.length > 0) {
        summaryData.push([
          "",
          "",
          "TOTAL",
          totalCount.toString(),
          "",
          "",
          ""
        ]);
      }

      // Draw summary table
      autoTable(doc, {
        head: [["Department", "From", "To", "Count", "Present", "Absent", "Absentees Reg No*"]],
        body: summaryData,
        startY: 75,
        theme: "grid",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: 'center'
        },
        bodyStyles: {
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 80 }
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });

      const summaryEndY = (doc as any).lastAutoTable.finalY + 10;

      // BLACK BOARD label
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("BLACK BOARD", 210, summaryEndY, { align: "center" });

      // Collect all roll numbers in column-by-column order (matching seating arrangement)
      const seatGrid: string[][] = Array(hall.rows).fill(null).map(() => Array(hall.columns * hall.seatsPerBench).fill(""));

      for (let r = 0; r < hall.rows; r++) {
        for (let c = 0; c < hall.columns * hall.seatsPerBench; c++) {
          const seat = seats[r]?.[c];
          if (seat?.rollNumber) {
            seatGrid[r][c] = seat.rollNumber;
          }
        }
      }

      // Find which columns have at least one student
      const totalColumns = hall.columns * hall.seatsPerBench;
      const nonEmptyColumns: number[] = [];

      for (let c = 0; c < totalColumns; c++) {
        let hasStudent = false;
        for (let r = 0; r < hall.rows; r++) {
          if (seatGrid[r][c]) {
            hasStudent = true;
            break;
          }
        }
        if (hasStudent) {
          nonEmptyColumns.push(c);
        }
      }

      // Calculate seating grid dimensions based on non-empty columns
      const gridStartY = summaryEndY + 8;
      const gridStartX = 14;
      const cellWidth = Math.min(28, (400 - gridStartX) / nonEmptyColumns.length);
      const cellHeight = 12;

      // Column labels (A, B, C, ...) - only for non-empty columns
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      nonEmptyColumns.forEach((actualCol, displayIndex) => {
        const columnLabel = String.fromCharCode(65 + actualCol); // A, B, C, ...
        const x = gridStartX + 12 + displayIndex * cellWidth;
        doc.text(columnLabel, x + cellWidth / 2, gridStartY - 2, { align: 'center' });
      });

      // Draw seating grid - only for non-empty columns
      for (let r = 0; r < hall.rows; r++) {
        const y = gridStartY + r * cellHeight;

        // Row number
        doc.setFont("helvetica", "bold");
        doc.text((r + 1).toString(), gridStartX + 5, y + cellHeight / 2 + 2, { align: 'center' });

        nonEmptyColumns.forEach((actualCol, displayIndex) => {
          const x = gridStartX + 12 + displayIndex * cellWidth;
          const rollNumber = seatGrid[r][actualCol];

          // Draw cell border
          doc.rect(x, y, cellWidth, cellHeight);

          // Draw roll number if exists
          if (rollNumber) {
            // Alternate between bold and italic for each column
            const isBoldColumn = actualCol % 2 === 0;
            doc.setFont("helvetica", isBoldColumn ? "bold" : "italic");
            doc.setFontSize(7);
            doc.text(rollNumber, x + cellWidth / 2, y + cellHeight / 2 + 2, {
              align: 'center',
              maxWidth: cellWidth - 2
            });
          }
        });
      }

      // Footer note
      const footerY = gridStartY + hall.rows * cellHeight + 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("* It should be filled carefully by Invigilators. Encircle the Absentees.", 14, footerY);

      // Signature line
      doc.setFont("helvetica", "normal");
      doc.text("Name & Signature of the Hall Superintendent", 300, footerY + 15);

      doc.save(`${hall.name}-seating-arrangement-${currentDate.replace(/\//g, '-')}.pdf`);

      toast({
        title: "Seating Arrangement Exported",
        description: "Detailed seating arrangement has been exported successfully."
      });
    } catch (error) {
      console.error("Error exporting bench layout:", error);
      toast({
        title: "Error",
        description: "Failed to export bench layout.",
        variant: "destructive",
      });
    }
  };

  /* 🔼🔼🔼 END WORD EXPORT 🔼🔼🔼 */

  const exportBenchLayoutWord = async () => {
    if (!hall) return;

    try {
      await exportBenchLayoutWordDoc({
        hall,
        seats,
        departments,
        examDate,
        examSession,
        examTime,
      });

      toast({
        title: "Word Exported",
        description: "Bench layout exported successfully as Word document.",
      });
    } catch (error) {
      console.error("Error exporting bench layout to Word:", error);
      toast({
        title: "Error",
        description: "Failed to export bench layout to Word.",
        variant: "destructive",
      });
    }
  };

  const saveSeatingPlan = async () => {
    if (!hall) return;

    try {
      const assignments: SeatAssignment[] = [];

      for (let r = 0; r < hall.rows; r++) {
        for (let c = 0; c < hall.columns; c++) {
          for (let s = 0; s < hall.seatsPerBench; s++) {
            const seatIndex = c * hall.seatsPerBench + s;
            const seat = seats[r][seatIndex];

            if (seat.rollNumber && seat.departmentId !== undefined) {
              assignments.push({
                hallId: hall.id,
                row: r + 1,
                column: c + 1,
                benchPosition: s + 1,
                studentRollNumber: seat.rollNumber,
                departmentId: seat.departmentId
              });
            }
          }
        }
      }

      await db.saveHallSeatAssignments(assignments);

      toast({
        title: "Saved",
        description: "Seating plan saved successfully."
      });
    } catch (error) {
      console.error("Error saving seating plan:", error);
      toast({
        title: "Error",
        description: "Failed to save seating plan.",
        variant: "destructive",
      });
    }
  };

  const handleSkipRollNumbers = () => {
    if (!skipInput.trim()) return;

    const newSkips = skipInput.split(',').map(num => num.trim());
    setSkipRollNumbers([...skipRollNumbers, ...newSkips]);
    setSkipInput("");

    toast({
      title: "Roll Numbers Skipped",
      description: `${newSkips.length} roll numbers added to skip list.`
    });
  };

  const handleAddManualRollNumbers = () => {
    if (!manualRollInput.trim()) return;

    const newRolls = manualRollInput.split(',').map(num => num.trim()).filter(n => n);
    setManualRollNumbers([...manualRollNumbers, ...newRolls]);
    setManualRollInput("");

    toast({
      title: "Manual Roll Numbers Added",
      description: `${newRolls.length} roll numbers added for manual allocation.`
    });
  };

  if (loading) {
    return <div className="p-8 text-center">Loading hall details...</div>;
  }

  if (!hall) {
    return <div className="p-8 text-center">Hall not found.</div>;
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold">Generate Seating Plan</h3>

          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="skipRollNumbers" className="block text-sm font-medium text-gray-700 mb-1">
                Skip Roll Numbers (comma separated)
              </label>
              <div className="flex gap-2">
                <Input
                  id="skipRollNumbers"
                  placeholder="e.g., 911123149005, 911123149012"
                  value={skipInput}
                  onChange={(e) => setSkipInput(e.target.value)}
                />
                <Button variant="outline" onClick={handleSkipRollNumbers}>
                  Add
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowManualAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Roll Numbers
            </Button>

            <Button onClick={generateSeatingPlan}>
              Generate Seating Plan
            </Button>

            <Button variant="outline" onClick={exportConsolidatedWord}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Consolidated Plan (Word)
            </Button>

            <Button variant="outline" onClick={exportBenchLayoutWord}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Bench Layout (Word)
            </Button>

            {skipRollNumbers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Skipped Roll Numbers:</h4>
                <div className="flex flex-wrap gap-2">
                  {skipRollNumbers.map((num, index) => (
                    <div key={index} className="bg-gray-100 px-2 py-1 rounded-md text-sm flex items-center">
                      {num}
                      <button
                        className="ml-1 text-gray-500 hover:text-red-500"
                        onClick={() => setSkipRollNumbers(skipRollNumbers.filter(n => n !== num))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {manualRollNumbers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Manual Roll Numbers:</h4>
                <div className="flex flex-wrap gap-2">
                  {manualRollNumbers.map((num, index) => (
                    <div key={index} className="bg-blue-100 px-2 py-1 rounded-md text-sm flex items-center">
                      {num}
                      <button
                        className="ml-1 text-gray-500 hover:text-red-500"
                        onClick={() => setManualRollNumbers(manualRollNumbers.filter(n => n !== num))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <h3 className="font-semibold mb-4">{hall.name} - Seating Plan</h3>
        <div className="border rounded-lg p-4 bg-white">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${hall.columns}, minmax(100px, 1fr))` }}>
            {Array.from({ length: hall.columns }).map((_, colIndex) => (
              <div key={colIndex} className="text-center font-semibold">
                Column {colIndex + 1}
              </div>
            ))}

            {Array.from({ length: hall.rows }).map((_, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {Array.from({ length: hall.columns }).map((_, colIndex) => {
                  const benchStart = colIndex * hall.seatsPerBench;

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="border rounded-lg p-2 bg-gray-50"
                    >
                      {Array.from({ length: hall.seatsPerBench }).map((_, seatIndex) => {
                        const seatIndexInRow = benchStart + seatIndex;
                        const seat = seats[rowIndex] && seats[rowIndex][seatIndexInRow];

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}-${seatIndex}`}
                            className={`mb-2 p-2 rounded-md ${seat?.departmentId !== undefined
                              ? 'bg-white border'
                              : 'bg-gray-100'}`}
                          >
                            <div className="text-xs">Seat {seatIndex + 1}</div>
                            {seat?.rollNumber ? (
                              <>
                                <div className="font-semibold">{seat.rollNumber}</div>
                                <div className="text-xs text-gray-500">{seat.departmentName}</div>
                              </>
                            ) : (
                              <div className="text-gray-400 italic">Empty</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div key={`row-label-${rowIndex}`} className="col-span-full border-t border-gray-200 mt-2 mb-4" />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end mt-4">
          <Button onClick={saveSeatingPlan}>
            Save Seating Plan
          </Button>
        </div>
      )}

      {/* Unallocated Roll Numbers Dialog */}
      <AlertDialog open={showUnallocatedDialog} onOpenChange={setShowUnallocatedDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Unallocated Roll Numbers</AlertDialogTitle>
            <AlertDialogDescription>
              The following roll numbers couldn't be allocated due to insufficient space:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {unallocatedRollNumbers.map((rollNum, index) => (
                <div key={index} className="bg-white p-2 rounded border text-sm">
                  {rollNum}
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Total unallocated: {unallocatedRollNumbers.length} students
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUnallocatedDialog(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Roll Number Addition Dialog */}
      <Dialog open={showManualAddDialog} onOpenChange={setShowManualAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Roll Numbers</DialogTitle>
            <DialogDescription>
              Add roll numbers that are outside the predefined department ranges
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="manualRolls">Roll Numbers (comma separated)</Label>
              <Input
                id="manualRolls"
                placeholder="e.g., 911123149999, 911123150000"
                value={manualRollInput}
                onChange={(e) => setManualRollInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowManualAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleAddManualRollNumbers();
              setShowManualAddDialog(false);
            }}>
              Add Roll Numbers
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HallView;
