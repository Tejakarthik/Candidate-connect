'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, MapPin, Briefcase, Star, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  role?: string;
  status: 'active' | 'pending' | 'interviewed' | 'hired' | 'rejected';
  createdBy?: string;
}

type Status = 'active' | 'pending' | 'interviewed' | 'hired' | 'rejected';

const statuses: Status[] = ['active', 'pending', 'interviewed', 'hired', 'rejected'];

interface CandidateCardProps {
  candidate: Candidate;
  onStatusChange: (id: string, status: Status) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

export default function CandidateCard({ candidate, onStatusChange, onDelete, currentUserId }: CandidateCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'interviewed':
        return 'bg-blue-100 text-blue-800';
      case 'hired':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isCreator = candidate.createdBy === currentUserId;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0">
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 pt-1">
              <CardTitle className="text-base sm:text-lg truncate">{candidate.name}</CardTitle>
              <Badge className={`${getStatusColor(candidate.status)} flex-shrink-0 mt-2 sm:hidden`}>
                {candidate.status
                  ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)
                  : ''}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Badge className={`${getStatusColor(candidate.status)} hidden sm:flex flex-shrink-0`}>
              {candidate.status
                ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)
                : ''}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreVertical className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(candidate.id, status);
                    }}
                    disabled={candidate.status === status}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isCreator && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(candidate.id);
                }}
                aria-label={`Delete candidate ${candidate.name}`}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-2">
        <div className="space-y-2">
          <div className="flex items-center text-xs sm:text-sm text-gray-600 min-w-0">
            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
          {candidate.role && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="break-words">{candidate.role}</span>
            </div>
          )}
          {candidate.experience && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <Star className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="break-words">{candidate.experience}</span>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="break-words">{candidate.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}