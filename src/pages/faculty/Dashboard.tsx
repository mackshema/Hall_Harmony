
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { db, Hall } from "@/lib/db";
import { getCurrentUser, logout } from "@/lib/auth";
import HallView from "@/components/HallView";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [assignedHalls, setAssignedHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  
  useEffect(() => {
    const fetchAssignedHalls = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          navigate("/login");
          return;
        }
        
        setUser(currentUser);
        
        const halls = await db.getAllHalls();
        const userAssignedHalls = halls.filter(hall => 
          hall.facultyAssigned && hall.facultyAssigned.includes(currentUser.id)
        );
        
        setAssignedHalls(userAssignedHalls);
        
        // Select the first hall by default if available
        if (userAssignedHalls.length > 0) {
          setSelectedHall(userAssignedHalls[0]);
        }
      } catch (error) {
        console.error("Error fetching assigned halls:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignedHalls();
  }, [navigate]);
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Faculty Portal</h1>
              {user && <p className="text-gray-600">Welcome, {user.name}</p>}
            </div>
            <Button onClick={handleLogout} variant="outline">Logout</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Assigned Halls</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <p>Loading your assigned halls...</p>
            </div>
          ) : assignedHalls.length > 0 ? (
            <>
              <NavigationMenu>
                <NavigationMenuList className="flex gap-2">
                  {assignedHalls.map(hall => (
                    <NavigationMenuItem key={hall.id}>
                      <Button
                        variant={selectedHall?.id === hall.id ? "default" : "outline"}
                        className="px-4 py-2"
                        onClick={() => setSelectedHall(hall)}
                      >
                        {hall.name}
                      </Button>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
              
              {/* Selected hall view */}
              {selectedHall && (
                <div className="mt-6">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>{selectedHall.name}</CardTitle>
                      <CardDescription>
                        Configuration: {selectedHall.rows} rows × {selectedHall.columns} columns, 
                        {selectedHall.seatsPerBench} seats per bench
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <HallView hallId={selectedHall.id} readOnly={true} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Assigned Halls</CardTitle>
              </CardHeader>
              <CardContent>
                <p>You have not been assigned to any exam halls yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
