import React, { useState, useEffect } from 'react';
import { WorkerProfile } from './WorkerProfile';
import WorkerService from '../services/workerService';
import type { BackendWorker } from '../types/worker';

// Transform backend worker data to frontend Worker interface
interface Worker {
  id:  string;
  name: string;
  email: string;
  phone: string;
  zone: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  rating: number;
  active: boolean;
  image?: string;
}

interface Report {
  id:  string;
  location: string;
  status: string;
  submittedAt: Date;
  assignedAt?:  Date;
  resolvedAt?: Date;
  wasteType: string;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  reportId?:  string;
}

interface WorkerProfileContainerProps {
  workerId: string | number;
  onBack: () => void;
}

export function WorkerProfileContainer({ workerId, onBack }: WorkerProfileContainerProps) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<Report[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform backend worker to frontend format
  const transformWorker = (backendWorker: BackendWorker): Worker => ({
    id: backendWorker.id?. toString() || backendWorker.employee_code || '',
    name:  backendWorker. name || '',
    email:  backendWorker. email || '',
    phone: backendWorker.phone || '',
    zone: backendWorker.zone_name || backendWorker.zone?. toString() || 'Unassigned',
    tasksCompleted: backendWorker.tasks_completed || backendWorker.total_tasks || 0,
    avgCompletionTime: backendWorker.avg_completion_time || 0,
    rating: backendWorker.rating || backendWorker.current_rating || 0,
    active:  backendWorker. is_active ??  true,
    image: backendWorker.profile_image || undefined,
  });

  // Transform backend assignment to frontend Report format
  const transformAssignment = (assignment: any): Report => ({
    id: assignment. id || assignment.report_id || '',
    location: assignment. location || assignment.address || '',
    status: assignment.status || '',
    submittedAt: new Date(assignment.created_at),
    assignedAt: assignment.assigned_at ?  new Date(assignment. assigned_at) : undefined,
    resolvedAt: assignment. resolved_at ? new Date(assignment.resolved_at) : undefined,
    wasteType: assignment.waste_type || assignment.category || '',
  });

  // Transform backend activity to frontend ActivityLog format
  const transformActivity = (activity: any): ActivityLog => ({
    id: activity. id || '',
    action: activity.action || activity.description || '',
    timestamp: new Date(activity.timestamp || activity.created_at),
    reportId: activity.report_id,
  });

  // Fetch all worker data
  const fetchWorkerData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch worker details, assignments, and activity in parallel
      const [workerData, assignmentsData, activityData] = await Promise.all([
        WorkerService. getWorker(workerId),
        WorkerService. getWorkerAssignments(workerId),
        WorkerService.getWorkerActivity(workerId),
      ]);

      // Transform and set worker data
      setWorker(transformWorker(workerData));

      // Transform and set assignments
      setCurrentAssignments(
        assignmentsData
          .filter((a: any) => a.status !== 'Resolved' && a.status !== 'Completed')
          .map(transformAssignment)
      );

      // Transform and set activity log
      setActivityLog(activityData.map(transformActivity));

    } catch (err:  any) {
      console.error('Error fetching worker data:', err);
      setError(err.message || 'Failed to load worker profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerData();
  }, [workerId]);

  // Handle password reset
  const handlePasswordReset = async (workerId: string) => {
    try {
      const result = await WorkerService.resetWorkerPassword(workerId);
      
      if (result. success) {
        alert(`Password reset email sent to ${result.email || 'worker email'}`);
      } else {
        alert(result.message || 'Failed to send password reset email');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      alert(err.message || 'Failed to reset password');
    }
  };

  // Handle send notification (bonus feature from your backend service)
  const handleSendNotification = async (workerId:  string, title: string, body: string) => {
    try {
      const result = await WorkerService.sendNotification(workerId, { title, body });
      
      if (result.success) {
        alert('Notification sent successfully');
      } else {
        alert(result.message || 'Failed to send notification');
      }
    } catch (err:  any) {
      console.error('Notification error:', err);
      alert(err.message || 'Failed to send notification');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading worker profile... </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500 text-6xl">⚠️</div>
        <h2 className="text-xl text-white">Failed to load worker profile</h2>
        <p className="text-slate-400">{error || 'Worker not found'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <WorkerProfile
      worker={worker}
      currentAssignments={currentAssignments}
      activityLog={activityLog}
      onBack={onBack}
      onPasswordReset={handlePasswordReset}
    />
  );
}