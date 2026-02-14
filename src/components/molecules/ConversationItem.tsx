import React from 'react';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import { Conversation } from '@/utils/types';
import { cn } from '@/utils';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: (conversation: Conversation) => void;
  onDelete?: (conversationId: number) => void;
  isActive?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onClick, onDelete, isActive }) => {
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
      )}
      onClick={() => onClick(conversation)}
    >
      <div className="shrink-0">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{conversation.title || 'New Conversation'}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatDate(conversation.updatedAt)}</span>
        </div>
      </div>

      {onDelete && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
          onClick={(e) => {
            e.stopPropagation();
            if (conversation.id) onDelete(conversation.id);
          }}
          title="Delete conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
