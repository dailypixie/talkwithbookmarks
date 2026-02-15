import React from 'react';
import { createRoot } from 'react-dom/client';
import MainView from '@/components/views/MainView';
import { initTheme } from '@/utils/theme';
import '@/ui/globals.css';

initTheme();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <MainView />
    </React.StrictMode>
  );
} else {
  // If root doesn't exist (e.g. old HTML), create it or clear body
  document.body.innerHTML = '<div id="root" class="h-full"></div>';
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  const newContainer = document.getElementById('root')!;
  const root = createRoot(newContainer);
  root.render(
    <React.StrictMode>
      <MainView />
    </React.StrictMode>
  );
}
