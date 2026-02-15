import React, { useEffect, useState } from 'react';
import { Conversation, MessageAction } from '@/utils/types';
import { ConversationList } from '@/components/molecules/ConversationList';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Runtime } from '@/utils/runtime';

interface ConversationHistoryProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onBack: () => void;
  activeConversationId?: number;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onSelectConversation,
  onNewChat,
  onBack,
  activeConversationId,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await Runtime.getConversationList();

      if (response && response.conversations) {
        setConversations(response.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Chat">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold text-lg">History</h2>
        </div>
        <Button onClick={onNewChat} size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConversationList
          conversations={conversations}
          onSelect={onSelectConversation}
          activeConversationId={activeConversationId}
          loading={loading}
        />
      </div>
    </div>
  );
};
