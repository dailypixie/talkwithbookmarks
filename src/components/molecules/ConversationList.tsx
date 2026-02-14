import React from 'react';
import { Conversation } from '@/utils/types';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
    conversations: Conversation[];
    onSelect: (conversation: Conversation) => void;
    onDelete?: (conversationId: number) => void;
    activeConversationId?: number;
    loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    onSelect,
    onDelete,
    activeConversationId,
    loading,
}) => {
    if (loading) {
        return (
            <div className="flex flex-col gap-2 p-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <p className="text-sm">No conversations yet.</p>
                <p className="text-xs mt-1">Start a new chat to begin!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-2">
            {conversations.map((conversation) => (
                <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={onSelect}
                    onDelete={onDelete}
                    isActive={conversation.id === activeConversationId}
                />
            ))}
        </div>
    );
};
