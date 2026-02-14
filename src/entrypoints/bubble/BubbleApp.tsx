import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Minimize2, Maximize2, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { ChatView } from '@/components/views/ChatView';
import { SummaryInterface } from '@/components/views/SummaryView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { cn } from '@/utils';

export default function BubbleApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>('chat');

  useEffect(() => {
    chrome.storage.local.get(['bubbleSplitScreen', 'bubbleIsOpen']).then((result) => {
      if (result.bubbleSplitScreen) setIsSplitScreen(true);
      if (result.bubbleIsOpen) setIsOpen(true);
    });
  }, []);

  const toggleOpen = (open: boolean) => {
    setIsOpen(open);
    chrome.storage.local.set({ bubbleIsOpen: open });
  };

  const toggleSplitScreen = () => {
    const newValue = !isSplitScreen;
    setIsSplitScreen(newValue);
    setIsMinimized(false);
    chrome.storage.local.set({ bubbleSplitScreen: newValue });
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-xl z-50 p-0 transition-all hover:scale-110"
        onClick={() => toggleOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      ref={setContainer}
      className={cn(
        'fixed z-50 shadow-2xl border bg-background font-sans text-foreground transition-all duration-300 ease-in-out flex flex-col',
        isSplitScreen
          ? 'top-0 right-0 h-screen w-[400px] rounded-none border-l border-t-0 border-b-0 border-r-0'
          : cn('bottom-4 right-4 rounded-lg', isMinimized ? 'w-64 h-12' : 'w-[400px] h-[600px]')
      )}
    >
      <div className="bg-primary text-primary-foreground p-3 flex justify-between items-center cursor-move handle shrink-0">
        <h3 className="font-semibold flex items-center gap-2 text-sm">Talk with Bookmarks</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/20 text-white"
            onClick={toggleSplitScreen}
            title={isSplitScreen ? 'Switch to floating mode' : 'Switch to split screen mode'}
          >
            {isSplitScreen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          {!isSplitScreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/20 text-white"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20 text-white" onClick={() => toggleOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn('flex-1 overflow-hidden flex flex-col', isMinimized && 'hidden')}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'summary')} className="flex-1 flex flex-col h-full">
          <div className="px-2 pt-2 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
            <SummaryInterface className="h-full" isActive={activeTab === 'summary'} />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
            <ChatView container={container} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
