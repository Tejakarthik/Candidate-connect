'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import {
  Candidate,
  Note,
  NewNote,
  addNote,
  getNotes,
  createNotification,
  getNotesPaginated,
  updateNote,
  deleteNote,
  addHistoryEvent,
  getHistoryEvents,
  HistoryEvent,
} from '@/lib/firestore';
import { AppUser, getUsers } from '@/lib/users';
import { Loader2, Send, MoreVertical, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeText } from '@/lib/sanitize';
import ConfirmationDialog from './ConfirmationDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotesModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  highlightedNoteId?: string | null;
}

export default function NotesModal({
  candidate,
  isOpen,
  onClose,
  highlightedNoteId,
}: NotesModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const PAGE_SIZE = 20;
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [addUserUids, setAddUserUids] = useState<string[]>([]);
  const [candidateDoc, setCandidateDoc] = useState<Candidate | null>(candidate);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  const notesEndRef = useRef<HTMLDivElement>(null);
  const highlightedNoteRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (candidate && isOpen) {
      setLoading(true);
      // Real-time listener for notes
      const unsubscribeNotes = getNotes(candidate.id, (realtimeNotes) => {
        setNotes(realtimeNotes);
        setLoading(false);
      });

      // Real-time listener for history
      const unsubscribeHistory = getHistoryEvents(candidate.id, (events) => {
        setHistory(events);
      });

      return () => {
        unsubscribeNotes();
        unsubscribeHistory();
      };
    }
  }, [candidate, isOpen]);

  useEffect(() => {
    if (highlightedNoteId && highlightedNoteRef.current) {
      highlightedNoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (isOpen && !editingNoteId) {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, isOpen, highlightedNoteId, editingNoteId]);

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await getUsers();
      setUsers(allUsers);
    };
    fetchUsers();
  }, []);

  // Real-time candidate doc updates
  useEffect(() => {
    if (candidate && isOpen) {
      const unsub = onSnapshot(doc(db, 'candidates', candidate.id), (snap) => {
        if (snap.exists()) setCandidateDoc({ id: snap.id, ...snap.data() } as Candidate);
      });
      return () => unsub();
    } else {
      setCandidateDoc(candidate);
    }
  }, [candidate, isOpen]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewNote(text);

    // Only show mention dropdown if @ is at the end of a word or being typed
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const mentionMatch = /(^|\s)@(\w*)$/.exec(textBeforeCursor);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[2]);
      setMentionPopoverOpen(true);
    } else {
      setMentionPopoverOpen(false);
    }
  };

  const handleMentionSelect = (user: AppUser) => {
    setNewNote((prev) => prev.replace(/@(\w*)$/, `@${user.name} `));
    setMentionPopoverOpen(false);
  };

  const handleSendNote = async () => {
    if (!newNote.trim() || !currentUser || !candidate) return;

    const mentions = users
      .filter((user) => newNote.includes(`@${user.name}`))
      .map((user) => user.uid);

    const noteToSend: NewNote = {
      text: sanitizeText(newNote),
      authorId: currentUser.uid,
      authorName: currentUser.displayName || 'User',
      mentions,
    };

    try {
      const noteId = await addNote(candidate.id, noteToSend);
      setNewNote('');

      // Create notifications for mentioned users
      for (const userId of mentions) {
        if (userId !== currentUser.uid) {
          await createNotification(userId, {
            candidateId: candidate.id,
            candidateName: candidate.name,
            noteId,
            messagePreview: newNote.length > 100 ? `${newNote.substring(0, 97)}...` : newNote,
            isRead: false,
          });
        }
      }
    } catch (error) {
      toast(<span>Error sending note.</span>);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !candidate || !currentUser) return;
    try {
      await updateNote(candidate.id, editingNoteId, sanitizeText(editingText));

      await addHistoryEvent(candidate.id, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Unnamed User',
        action: 'Note Edited',
        details: `A note was edited.`,
      });

      toast(<span>Note updated successfully.</span>);
      handleCancelEdit();
    } catch (error) {
      toast(<span>Failed to update note.</span>);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDeleteId || !candidate || !currentUser) return;
    try {
      await deleteNote(candidate.id, noteToDeleteId);

      await addHistoryEvent(candidate.id, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Unnamed User',
        action: 'Note Deleted',
        details: 'A note was deleted.',
      });

      toast(<span>Note deleted successfully.</span>);
      setNoteToDeleteId(null);
    } catch (error) {
      toast(<span>Failed to delete note.</span>);
      setNoteToDeleteId(null);
    }
  };

  // Access control check
  const isAssigned = candidateDoc?.assignedUsers?.includes(currentUser?.uid ?? '');

  // Add users to assignedUsers
  const handleAddUsers = async () => {
    if (!candidateDoc || !currentUser) return;
    const newAssigned = Array.from(new Set([...(candidateDoc.assignedUsers || []), ...addUserUids]));
    const addedUsers = users.filter((u) => addUserUids.includes(u.uid)).map((u) => u.name);
    try {
      await updateDoc(doc(db, 'candidates', candidateDoc.id), { assignedUsers: newAssigned });

      if (addedUsers.length > 0) {
        await addHistoryEvent(candidateDoc.id, {
          authorId: currentUser.uid,
          authorName: currentUser.displayName || 'Unnamed User',
          action: 'Access Granted',
          details: `Gave access to ${addedUsers.join(', ')}.`,
        });
      }

      toast(<span>Users added: Access list updated.</span>);
      setAddUserUids([]);
    } catch (e) {
      toast(<span>Failed to add users.</span>);
    }
  };

  // If not assigned, show toast and fallback UI
  useEffect(() => {
    if (isOpen && candidate && !isAssigned) {
      toast(<span>Access denied: You are not assigned to this candidate.</span>);
    }
  }, [isOpen, candidate, isAssigned]);

  // Users not already assigned
  const availableUsers = users.filter(
    (u) => !(candidateDoc?.assignedUsers || []).includes(u.uid)
  );

  if (!isAssigned) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Notes for {candidate?.name}</DialogTitle>
          </DialogHeader>
          <div className="text-center text-red-500 font-semibold py-8">
            Access denied: You are not assigned to this candidate.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const filteredUsers = users.filter(
    (user) => user.name && user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-full sm:h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Notes for {candidateDoc?.name}</DialogTitle>
        </DialogHeader>
        {/* Add users to access list */}
        <div className="mb-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start mb-2">
                {addUserUids.length > 0
                  ? users.filter((u) => addUserUids.includes(u.uid)).map((u) => u.name).join(', ')
                  : 'Add users to access...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-screen max-w-[300px] sm:max-w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  {availableUsers.map((user) => (
                    <CommandItem
                      key={user.uid}
                      onSelect={() => setAddUserUids((prev) =>
                        prev.includes(user.uid)
                          ? prev.filter((id) => id !== user.uid)
                          : [...prev, user.uid]
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={addUserUids.includes(user.uid)}
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
          <Button
            className="mt-2"
            disabled={addUserUids.length === 0}
            onClick={handleAddUsers}
            aria-label="Add selected users to the candidate access list"
          >
            Add Selected Users
          </Button>
        </div>
        <Tabs defaultValue="notes" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent
            value="notes"
            className="flex-grow overflow-y-auto mt-2 p-4 bg-slate-50 rounded-md"
          >
            <div
              ref={notesContainerRef}
              className="h-full space-y-4"
            >
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {notes.map((note) => {
                    const isHighlighted = note.id === highlightedNoteId;
                    const isEditing = editingNoteId === note.id;
                    const isAuthor = note.authorId === currentUser?.uid;

                    return (
                      <div
                        key={note.id}
                        ref={isHighlighted ? highlightedNoteRef : null}
                        className={`p-2 rounded-lg transition-colors duration-500 ease-in-out group ${
                          isHighlighted ? 'bg-blue-100' : 'bg-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="font-bold text-sm">{note.authorName}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {note.createdAt && format(note.createdAt.toDate ? note.createdAt.toDate() : note.createdAt, 'PPpp')}
                            </span>
                          </div>
                          {isAuthor && !isEditing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditNote(note)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setNoteToDeleteId(note.id)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-2">
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="mb-2"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm bg-white p-2 rounded-md shadow-sm">{note.text}</p>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={notesEndRef} />
            </div>
          </TabsContent>
          <TabsContent
            value="history"
            className="flex-grow overflow-y-auto mt-2 p-4 bg-slate-50 rounded-md"
          >
            <div className="space-y-3">
              {history.map((event) => (
                <div key={event.id} className="text-sm">
                  <p>
                    <span className="font-semibold">{event.authorName}</span>{' '}
                    <span className="text-gray-600">{event.action.toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {event.timestamp && format(event.timestamp.toDate(), 'PPpp')}
                  </p>
                  <p className="text-gray-700 mt-1 pl-2 border-l-2">{event.details}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0">
          <div className="w-full relative">
            <Popover open={isMentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
              <PopoverAnchor asChild>
                <Textarea
                  placeholder="Type your note here... Use @ to mention users."
                  value={newNote}
                  onChange={handleNoteChange}
                  className="pr-12"
                  disabled={!!editingNoteId}
                />
              </PopoverAnchor>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search for a user..." />
                  <CommandList>
                    {filteredUsers.map((user) => (
                      <CommandItem key={user.uid} onSelect={() => handleMentionSelect(user)}>
                        {user.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleSendNote}
              disabled={!newNote.trim() || !!editingNoteId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <ConfirmationDialog
        isOpen={!!noteToDeleteId}
        onClose={() => setNoteToDeleteId(null)}
        onConfirm={handleDeleteNote}
        title="Delete this note?"
        description="This action cannot be undone. The note will be permanently deleted."
      />
    </Dialog>
  );
} 