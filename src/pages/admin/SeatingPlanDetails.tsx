
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, Hall, User } from "@/lib/db";
import HallView from "@/components/HallView";

const SeatingPlanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hall, setHall] = useState<Hall | null>(null);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHallDetails = async () => {
      if (!id) return;

      try {
        const hallId = parseInt(id);
        const hallData = await db.getHallById(hallId);
        setHall(hallData);
        
        const facultyData = await db.getAllFaculty();
        setFaculty(facultyData);
      } catch (error) {
        console.error("Error fetching hall details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHallDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading hall details...
      </div>
    );
  }

  if (!hall) {
    return (
      <div className="p-8 text-center">
        <p>Hall not found. The hall may have been deleted.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/halls')}>
          Back to Halls
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{hall.name} - Seating Plan</h1>
          <p className="text-gray-600">
            Configure and manage the seating plan for this exam hall
          </p>
        </div>
        
        <Button variant="outline" onClick={() => navigate('/admin/seating-plans')}>
          Back to All Plans
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hall Configuration</CardTitle>
          <CardDescription>
            This hall has {hall.rows} rows, {hall.columns} columns, and {hall.seatsPerBench} seats per bench.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hall.facultyAssigned && hall.facultyAssigned.length > 0 ? (
            <div>
              <p className="font-semibold">Assigned Faculty:</p>
              <ul className="list-disc pl-5 mt-2">
                {hall.facultyAssigned.map(facId => {
                  const facMember = faculty.find(f => f.id === facId);
                  return facMember ? (
                    <li key={facId}>{facMember.name}</li>
                  ) : null;
                })}
              </ul>
            </div>
          ) : (
            <p>No faculty assigned to this hall.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seating Plan</CardTitle>
          <CardDescription>
            Generate and view the seating arrangement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HallView hallId={hall.id} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SeatingPlanDetails;
