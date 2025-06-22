'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import CandidateCard from '@/components/CandidateCard';
import NotificationCard from '@/components/NotificationCard';
import { Plus, LogOut, Users, Bell, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  addCandidate,
  getCandidates,
  Candidate,
  NewCandidate,
  updateCandidateStatus,
  getNotifications,
  Notification as NotificationType,
  markNotificationAsRead,
  deleteCandidate,
  addHistoryEvent,
} from '@/lib/firestore';
import NotesModal from '@/components/NotesModal';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { AppUser, getUsers } from '@/lib/users';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { sanitizeText } from '@/lib/sanitize';

// Mock data for notifications - can be replaced with real data later
const mockNotifications = [
  {
    id: '1',
    type: 'candidate' as const,
    title: 'New Candidate Application',
    description: 'Sarah Johnson has submitted an application for the Senior Developer position.',
    timestamp: '2 hours ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'interview' as const,
    title: 'Interview Scheduled',
    description: 'Interview with Michael Chen scheduled for tomorrow at 2:00 PM.',
    timestamp: '4 hours ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'message' as const,
    title: 'Message from HR',
    description: 'Please review the updated interview guidelines.',
    timestamp: '1 day ago',
    isRead: true,
  },
  {
    id: '4',
    type: 'general' as const,
    title: 'System Update',
    description: 'The platform will undergo maintenance this weekend.',
    timestamp: '2 days ago',
    isRead: true,
  },
];

export default function HomePage() {
  const { currentUser, logout, loading } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);

  const [newCandidate, setNewCandidate] = useState<NewCandidate>({
    name: '',
    email: '',
    phone: '',
    location: '',
    role: '',
    experience: '',
    status: 'pending',
    assignedUsers: [],
    createdBy: currentUser?.uid || '',
  });

  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);

  const fetchCandidates = async () => {
    try {
      const candidatesData = await getCandidates();
      setCandidates(candidatesData);
    } catch (error) {
      toast('Error', {
        description: 'Failed to fetch candidates.'
      });
    }
  };

  useEffect(() => {
    if (!loading && currentUser) {
      fetchCandidates();
      const unsubscribe = getNotifications(currentUser.uid, setNotifications);
      return () => unsubscribe();
    }
  }, [currentUser, loading]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (isDialogOpen) {
      getUsers().then(setUsers);
    }
  }, [isDialogOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      // Error is handled in the auth context
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewCandidate((prev) => ({ ...prev, [id]: value }));
  };

  const handleUserSelect = (uid: string) => {
    setSelectedUserUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectedUsers = users.filter((u) => selectedUserUids.includes(u.uid));

  const resetCandidateForm = () => {
    setNewCandidate({
      name: '',
      email: '',
      phone: '',
      location: '',
      role: '',
      experience: '',
      status: 'pending',
      assignedUsers: [],
      createdBy: currentUser?.uid || '',
    });
    setSelectedUserUids([]);
  };

  const handleAddCandidate = async () => {
    console.log('handleAddCandidate called');
    if (!newCandidate.name || !newCandidate.email) {
      toast('Validation Error', {
        description: 'Name and email are required.'
      });
      return;
    }
    try {
      const allAssigned = Array.from(new Set([...selectedUserUids.filter(Boolean), currentUser?.uid].filter((id): id is string => Boolean(id))));
      const newCandidateData: NewCandidate = {
        ...newCandidate,
        name: sanitizeText(newCandidate.name || ''),
        email: sanitizeText(newCandidate.email || ''),
        phone: sanitizeText(newCandidate.phone || ''),
        location: sanitizeText(newCandidate.location || ''),
        role: sanitizeText(newCandidate.role || ''),
        experience: sanitizeText(newCandidate.experience || ''),
        assignedUsers: allAssigned,
        createdBy: currentUser?.uid || '',
        createdAt: new Date(), // serverTimestamp will be set in Firestore
      };

      const candidateId = await addCandidate(newCandidateData);

      if (currentUser) {
        await addHistoryEvent(candidateId, {
          authorId: currentUser.uid,
          authorName: currentUser.displayName || 'Unnamed User',
          action: 'Status Updated',
          details: `Candidate profile for ${newCandidateData.name} was created.`,
        });
      }

      toast('Success', {
        description: 'Candidate added successfully.'
      });
      setIsDialogOpen(false);
      resetCandidateForm();
      fetchCandidates(); // Refresh the list
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast('Error', {
        description: 'Failed to add candidate.'
      });
    }
  };

  const handleStatusChange = async (
    id: string,
    status: 'active' | 'interviewed' | 'pending' | 'hired' | 'rejected'
  ) => {
    const originalCandidate = candidates.find((c) => c.id === id);
    if (!originalCandidate || !currentUser) {
      toast('Error', {
        description: 'Could not find candidate to update.',
      });
      return;
    }

    try {
      await updateCandidateStatus(id, status);

      await addHistoryEvent(id, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Unnamed User',
        action: 'Status Updated',
        details: `Status changed from ${originalCandidate.status} to ${status}.`,
      });

      toast('Success', {
        description: "Candidate's status updated."
      });
      fetchCandidates(); // Refresh the list
    } catch (error) {
      toast('Error', {
        description: 'Failed to update status.'
      });
    }
  };

  const handleCandidateClick = (candidate: Candidate) => {
    if (!currentUser) return;
    
    if (!candidate.assignedUsers.includes(currentUser.uid)) {
      toast('Access Denied', {
        description: 'You are not assigned to this candidate and cannot view their details.',
        action: {
          label: 'Close',
          onClick: () => {},
        },
      });
      return;
    }
    
    setSelectedCandidate(candidate);
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    if (!currentUser) return;

    if (!notification.isRead) {
      try {
        await markNotificationAsRead(currentUser.uid, notification.id);
      } catch (error) {
        toast('Error', {
          description: 'Failed to mark notification as read.'
        });
      }
    }

    const candidate = candidates.find((c) => c.id === notification.candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
      setHighlightedNoteId(notification.noteId);
    } else {
      toast('Error', {
        description: 'Associated candidate not found.'
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedCandidate(null);
    setHighlightedNoteId(null);
  };

  const handleDeleteRequest = (candidateId: string) => {
    setCandidateToDelete(candidateId);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidate(candidateToDelete);
      toast('Success', {
        description: 'Candidate removed successfully.'
      });
      fetchCandidates();
    } catch (error) {
      toast('Error', {
        description: 'Failed to remove candidate.'
      });
    } finally {
      setCandidateToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {currentUser.displayName}!
              </h1>
              <p className="text-sm text-gray-600">
                Manage your candidates and stay updated with notifications
              </p>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="flex items-center space-x-2 mt-2 sm:mt-0"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Candidates Section */}
          <div className="lg:col-span-2 order-last lg:order-none">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <CardTitle>Candidates</CardTitle>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetCandidateForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="p-2 sm:px-3">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Add Candidate</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                      <DialogHeader>
                        <DialogTitle>Add a New Candidate</DialogTitle>
                        <DialogDescription>
                          Fill in the details below to add a new candidate to your pipeline.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="sm:text-right">Name</Label>
                          <Input id="name" value={newCandidate.name} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="sm:text-right">Email</Label>
                          <Input id="email" value={newCandidate.email} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="role" className="sm:text-right">Role</Label>
                          <Input id="role" value={newCandidate.role} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="experience" className="sm:text-right">Experience</Label>
                          <Input id="experience" value={newCandidate.experience} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="sm:text-right">Phone</Label>
                          <Input id="phone" value={newCandidate.phone} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="location" className="sm:text-right">Location</Label>
                          <Input id="location" value={newCandidate.location} onChange={handleInputChange} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label className="sm:text-right">Assign Users</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="sm:col-span-3 w-full justify-start">
                                {selectedUsers.length > 0
                                  ? selectedUsers.map((u) => u.name).join(', ')
                                  : 'Select users...'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Search users..." />
                                <CommandList>
                                  {users.map((user) => (
                                    <CommandItem
                                      key={user.uid}
                                      onSelect={() => handleUserSelect(user.uid)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedUserUids.includes(user.uid)}
                                        readOnly
                                        className="mr-2"
                                      />
                                      {user.name} <span className="ml-2 text-xs text-gray-500">{user.email}</span>
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {selectedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {selectedUsers.map((user) => (
                              <Badge key={user.uid}>{user.name}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAddCandidate}>Add Candidate</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <CardDescription>
                  Manage your candidate pipeline and track their progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} onClick={() => handleCandidateClick(candidate)} className="cursor-pointer">
                      <CandidateCard
                        candidate={candidate}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteRequest}
                        currentUserId={currentUser?.uid}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications Section */}
          <div className="lg:col-span-1 order-first lg:order-none">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>
                  Stay updated with recent activities and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <NotificationCard notification={notification} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">{candidates.length}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full" aria-label="Total candidates icon">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {candidates.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center" aria-label="Active candidates icon">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {notifications.filter(n => !n.isRead).length}
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full" aria-label="Unread notifications icon">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <NotesModal
        isOpen={!!selectedCandidate}
        onClose={handleCloseModal}
        candidate={selectedCandidate}
        highlightedNoteId={highlightedNoteId}
      />
      <ConfirmationDialog
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the candidate and all their associated data."
      />
    </div>
  );
}