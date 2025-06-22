'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, User, MessageSquare } from 'lucide-react';
import { Notification } from '@/lib/firestore';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCardProps {
  notification: Notification;
}

export default function NotificationCard({ notification }: NotificationCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${!notification.isRead ? 'bg-blue-50' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              <Bell className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{notification.candidateName}</p>
              {notification.createdAt && (
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1">{notification.messagePreview}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}