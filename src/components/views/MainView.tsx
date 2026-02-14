import { useState } from 'react';
import { ChatInterface } from '@/components/views/ChatView';
import { SummaryInterface } from '@/components/views/SummaryView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { IndexingInterface } from './IndexingView';

export default function MainView() {
  const [activeTab, setActiveTab] = useState<string>('chat');

  return (
    <div className="w-[399px] h-full bg-background flex flex-col font-sans">
      <div className="flex items-center justify-between shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">Talk with Bookmarks</h1>
        <ThemeToggle />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full min-h-0">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="index">Index</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
          <SummaryInterface className="h-full" isActive={activeTab === 'summary'} />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
          <ChatInterface className="h-full border-0" />
        </TabsContent>

        <TabsContent value="index" className="flex-1 overflow-auto mt-0 data-[state=active]:flex flex-col">
          <IndexingInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
