
// Simulating database operations with localStorage for now
// In a real application, you would use SQLite or another database

export interface User {
  id: number;
  name: string;
  username: string;
  password: string; // In a real app, this would be hashed
  role: 'admin' | 'faculty';
  department?: string;
}

export interface Department {
  id: number;
  name: string;
  rollNumberStart: string;
  rollNumberEnd: string;
}

export interface Hall {
  id: number;
  name: string;
  rows: number;
  columns: number;
  seatsPerBench: number;
  facultyAssigned: number[];
  floor?: string;
}

export interface SeatAssignment {
  hallId: number;
  row: number;
  column: number;
  benchPosition: number;
  studentRollNumber: string;
  departmentId: number;
}

class DatabaseService {
  private seedInitialData() {
    // Force refresh of user data to match the login form
    console.log("Seeding initial database with correct credentials...");
    
    // Add sample users with the correct credentials matching the login form
    const users: User[] = [
      { id: 1, name: "Admin User", username: "SRM@Admin", password: "Admin@12345678", role: "admin" },
      { id: 2, name: "Faculty User", username: "faculty@1234", password: "srm@123456789", role: "faculty" }
    ];
    
    // Force update the users data
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('departments', JSON.stringify([]));
    localStorage.setItem('halls', JSON.stringify([]));
    localStorage.setItem('seatAssignments', JSON.stringify([]));
    localStorage.setItem('dbSeeded', 'true');
    
    console.log("Database seeded with users:", users);
  }

  constructor() {
    this.seedInitialData();
  }

  // User methods
  async getUserByCredentials(username: string, password: string): Promise<User | null> {
    console.log("Attempting login with:", { username, password });
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    console.log("Available users:", users);
    
    const user = users.find(u => u.username === username && u.password === password);
    console.log("Found user:", user);
    
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.id === id) || null;
  }

  async getAllFaculty(): Promise<User[]> {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    return users.filter(u => u.role === 'faculty');
  }

  async addFaculty(faculty: Omit<User, 'id'>): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 3;
    
    const newFaculty: User = {
      id: newId,
      ...faculty
    };
    
    users.push(newFaculty);
    localStorage.setItem('users', JSON.stringify(users));
    
    return newFaculty;
  }

  async deleteFaculty(id: number): Promise<boolean> {
    const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const newUsers = users.filter(u => u.id !== id || u.role !== 'faculty');
    
    if (users.length !== newUsers.length) {
      localStorage.setItem('users', JSON.stringify(newUsers));
      return true;
    }
    
    return false;
  }

  // Department methods
  async addDepartment(department: Omit<Department, 'id'>): Promise<Department> {
    const departments: Department[] = JSON.parse(localStorage.getItem('departments') || '[]');
    const newId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
    
    const newDepartment: Department = {
      id: newId,
      ...department
    };
    
    departments.push(newDepartment);
    localStorage.setItem('departments', JSON.stringify(departments));
    
    return newDepartment;
  }

  async getAllDepartments(): Promise<Department[]> {
    return JSON.parse(localStorage.getItem('departments') || '[]');
  }

  async updateDepartment(department: Department): Promise<Department> {
    const departments: Department[] = JSON.parse(localStorage.getItem('departments') || '[]');
    const index = departments.findIndex(d => d.id === department.id);
    
    if (index !== -1) {
      departments[index] = department;
      localStorage.setItem('departments', JSON.stringify(departments));
    }
    
    return department;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const departments: Department[] = JSON.parse(localStorage.getItem('departments') || '[]');
    const newDepartments = departments.filter(d => d.id !== id);
    
    if (departments.length !== newDepartments.length) {
      localStorage.setItem('departments', JSON.stringify(newDepartments));
      return true;
    }
    
    return false;
  }

  // Hall methods
  async addHall(hall: Omit<Hall, 'id'>): Promise<Hall> {
    const halls: Hall[] = JSON.parse(localStorage.getItem('halls') || '[]');
    const newId = halls.length > 0 ? Math.max(...halls.map(h => h.id)) + 1 : 1;
    
    const newHall: Hall = {
      id: newId,
      ...hall
    };
    
    halls.push(newHall);
    localStorage.setItem('halls', JSON.stringify(halls));
    
    return newHall;
  }

  async getAllHalls(): Promise<Hall[]> {
    return JSON.parse(localStorage.getItem('halls') || '[]');
  }

  async getHallById(id: number): Promise<Hall | null> {
    const halls: Hall[] = JSON.parse(localStorage.getItem('halls') || '[]');
    return halls.find(h => h.id === id) || null;
  }

  async updateHall(hall: Hall): Promise<Hall> {
    const halls: Hall[] = JSON.parse(localStorage.getItem('halls') || '[]');
    const index = halls.findIndex(h => h.id === hall.id);
    
    if (index !== -1) {
      halls[index] = hall;
      localStorage.setItem('halls', JSON.stringify(halls));
    }
    
    return hall;
  }

  async deleteHall(id: number): Promise<boolean> {
    const halls: Hall[] = JSON.parse(localStorage.getItem('halls') || '[]');
    const newHalls = halls.filter(h => h.id !== id);
    
    if (halls.length !== newHalls.length) {
      localStorage.setItem('halls', JSON.stringify(newHalls));
      return true;
    }
    
    return false;
  }

  // Seat Assignment methods
  async saveHallSeatAssignments(assignments: SeatAssignment[]): Promise<void> {
    const hallId = assignments[0]?.hallId;
    if (!hallId) return;
    
    // Delete existing assignments for this hall
    const allAssignments: SeatAssignment[] = JSON.parse(localStorage.getItem('seatAssignments') || '[]');
    const otherHallsAssignments = allAssignments.filter(a => a.hallId !== hallId);
    
    // Add new assignments
    const updatedAssignments = [...otherHallsAssignments, ...assignments];
    localStorage.setItem('seatAssignments', JSON.stringify(updatedAssignments));
  }

  async getHallSeatAssignments(hallId: number): Promise<SeatAssignment[]> {
    const allAssignments: SeatAssignment[] = JSON.parse(localStorage.getItem('seatAssignments') || '[]');
    return allAssignments.filter(a => a.hallId === hallId);
  }

  async generateHallSeatingPlan(hallId: number, skipRollNumbers: string[] = [], manualRollNumbers: string[] = []): Promise<{ 
    success: boolean; 
    unallocated: string[];
    warnings: string[];
  }> {
    const hall = await this.getHallById(hallId);
    const departments = await this.getAllDepartments();
    const warnings: string[] = [];
    
    if (!hall || departments.length === 0) {
      return { success: false, unallocated: [], warnings: ["Hall or departments not found"] };
    }
    
    // Calculate hall capacity
    const hallCapacity = hall.rows * hall.columns * hall.seatsPerBench;
    
    // Collect students from all departments
    const departmentStudents: { [deptId: number]: string[] } = {};
    let totalStudents = 0;
    
    for (const dept of departments) {
      const students: string[] = [];
      const start = parseInt(dept.rollNumberStart);
      const end = parseInt(dept.rollNumberEnd);
      
      for (let i = start; i <= end; i++) {
        const rollNumber = i.toString();
        if (!skipRollNumbers.includes(rollNumber)) {
          students.push(rollNumber);
        }
      }
      
      departmentStudents[dept.id] = students;
      totalStudents += students.length;
    }
    
    // Add manual roll numbers as a separate department (id: 0)
    if (manualRollNumbers.length > 0) {
      departmentStudents[0] = [...manualRollNumbers];
      totalStudents += manualRollNumbers.length;
    }
    
    // Check capacity warnings
    if (totalStudents > hallCapacity) {
      const overflow = totalStudents - hallCapacity;
      warnings.push(`Warning: ${overflow} students cannot be allocated due to limited hall capacity (${hallCapacity} seats available).`);
    }
    
    // Create seat grid for column-first filling with department alternation
    const assignments: SeatAssignment[] = [];
    const unallocated: string[] = [];
    const deptIds = Object.keys(departmentStudents).map(id => parseInt(id));
    const numDepts = deptIds.length;
    
    // Create a 2D grid to track seats (row, column index including bench position)
    const totalCols = hall.columns * hall.seatsPerBench;
    const seatGrid: { student: string; deptId: number }[][] = Array(hall.rows)
      .fill(null)
      .map(() => Array(totalCols).fill(null));
    
    // NEW LOGIC: Column-first filling with department-based column assignment
    // Case 1 (One Department): Fill Col A, skip Col B, fill Col C, skip Col D, etc.
    // Case 2 (Two Departments): Col A = Dept1, Col B = Dept2, Col C = Dept1, Col D = Dept2, etc.
    // Case 3 (Three+ Departments): Col A = Dept1, Col B = Dept2, Col C = Dept3, etc.
    
    for (let col = 0; col < totalCols; col++) {
      let deptIdForThisColumn: number;
      
      if (numDepts === 1) {
        // Case 1: One department - fill only even columns (A, C, E, ...)
        if (col % 2 !== 0) {
          // Skip odd columns (B, D, F, ...)
          continue;
        }
        deptIdForThisColumn = deptIds[0];
      } else if (numDepts === 2) {
        // Case 2: Two departments - alternate columns
        deptIdForThisColumn = deptIds[col % 2];
      } else {
        // Case 3: Three or more departments - cycle through departments
        deptIdForThisColumn = deptIds[col % numDepts];
      }
      
      // Fill all rows in this column with the assigned department
      for (let row = 0; row < hall.rows; row++) {
        if (departmentStudents[deptIdForThisColumn] && departmentStudents[deptIdForThisColumn].length > 0) {
          const student = departmentStudents[deptIdForThisColumn].shift()!;
          seatGrid[row][col] = { student, deptId: deptIdForThisColumn };
        }
      }
    }
    
    // Convert grid to assignments
    for (let row = 0; row < hall.rows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const seat = seatGrid[row][col];
        if (seat) {
          const benchColumn = Math.floor(col / hall.seatsPerBench);
          const benchPosition = col % hall.seatsPerBench;
          
          assignments.push({
            hallId: hall.id,
            row: row + 1,
            column: benchColumn + 1,
            benchPosition: benchPosition + 1,
            studentRollNumber: seat.student,
            departmentId: seat.deptId
          });
        }
      }
    }
    
    // Collect unallocated students
    for (const deptId of deptIds) {
      unallocated.push(...departmentStudents[deptId]);
    }
    
    if (unallocated.length > 0) {
      warnings.push(`Some seat numbers are missing due to limited space: ${unallocated.join(', ')}`);
    }
    
    // Save assignments for this hall
    await this.saveHallSeatAssignments(assignments);
    
    return { success: true, unallocated, warnings };
  }

  async generateAllSeatingPlans(): Promise<{ success: boolean; unallocated: string[] }> {
    // Clear all existing seat assignments
    localStorage.setItem('seatAssignments', JSON.stringify([]));
    
    // Get all departments and halls
    const departments = await this.getAllDepartments();
    const halls = await this.getAllHalls();
    
    if (halls.length === 0) {
      return { success: false, unallocated: [] };
    }
    
    // Collect all students from all departments
    const allStudents: { rollNumber: string; departmentId: number }[] = [];
    
    for (const dept of departments) {
      const start = parseInt(dept.rollNumberStart);
      const end = parseInt(dept.rollNumberEnd);
      
      for (let i = start; i <= end; i++) {
        allStudents.push({
          rollNumber: i.toString(),
          departmentId: dept.id
        });
      }
    }
    
    // Calculate total capacity across all halls
    let totalCapacity = 0;
    const hallCapacities: { hallId: number; capacity: number; seats: { row: number; column: number; benchPosition: number }[] }[] = [];
    
    for (const hall of halls) {
      const seats: { row: number; column: number; benchPosition: number }[] = [];
      for (let row = 0; row < hall.rows; row++) {
        for (let col = 0; col < hall.columns; col++) {
          for (let pos = 0; pos < hall.seatsPerBench; pos++) {
            seats.push({ row, column: col, benchPosition: pos });
          }
        }
      }
      const capacity = seats.length;
      totalCapacity += capacity;
      hallCapacities.push({ hallId: hall.id, capacity, seats });
    }
    
    // Distribute students with department alternation
    const allAssignments: SeatAssignment[] = [];
    const deptIds = Array.from(new Set(allStudents.map(s => s.departmentId)));
    const departmentStudents: { [deptId: number]: string[] } = {};
    
    // Group by department
    for (const deptId of deptIds) {
      departmentStudents[deptId] = allStudents
        .filter(s => s.departmentId === deptId)
        .map(s => s.rollNumber);
    }
    
    // Allocate students to halls with alternation
    let globalSeatIndex = 0;
    const unallocated: string[] = [];
    
    for (const hallCapacity of hallCapacities) {
      let hallSeatIndex = 0;
      let allEmpty = false;
      
      while (hallSeatIndex < hallCapacity.seats.length && !allEmpty) {
        allEmpty = true;
        
        for (const deptId of deptIds) {
          if (departmentStudents[deptId].length > 0 && hallSeatIndex < hallCapacity.seats.length) {
            allEmpty = false;
            const student = departmentStudents[deptId].shift()!;
            const seat = hallCapacity.seats[hallSeatIndex];
            
            allAssignments.push({
              hallId: hallCapacity.hallId,
              row: seat.row + 1,
              column: seat.column + 1,
              benchPosition: seat.benchPosition + 1,
              studentRollNumber: student,
              departmentId: deptId
            });
            
            hallSeatIndex++;
            globalSeatIndex++;
          }
        }
      }
    }
    
    // Track unallocated students
    for (const deptId of deptIds) {
      unallocated.push(...departmentStudents[deptId]);
    }
    
    // Save all assignments
    localStorage.setItem('seatAssignments', JSON.stringify(allAssignments));
    
    return { success: true, unallocated };
  }

  async getAllSeatAssignments(): Promise<SeatAssignment[]> {
    return JSON.parse(localStorage.getItem('seatAssignments') || '[]');
  }
}

export const db = new DatabaseService();
