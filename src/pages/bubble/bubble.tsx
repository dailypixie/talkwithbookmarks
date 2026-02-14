import React from 'react';
import { createRoot } from 'react-dom/client';
import BubbleApp from './BubbleApp';

const HOST_ID = 'talkwithbookmarks-bubble-host';

function inject() {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.bottom = '0';
  host.style.right = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.pointerEvents = 'none';

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  rootDiv.style.pointerEvents = 'auto';
  shadow.appendChild(rootDiv);

  try {
    const cssUrl = new URL('./bubble.css', import.meta.url).href;
    fetch(cssUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.text();
      })
      .then((css) => {
        const style = document.createElement('style');
        style.textContent = css;
        shadow.appendChild(style);
      })
      .catch((err) => console.error('[TalkWithBookmarks] CSS fetch error:', err));
  } catch (e) {
    console.error('[TalkWithBookmarks] CSS resolution error:', e);
  }

  try {
    const root = createRoot(rootDiv);
    root.render(
      <React.StrictMode>
        <BubbleApp />
      </React.StrictMode>
    );
  } catch (e) {
    console.error('[TalkWithBookmarks] Mount error:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject);
} else {
  inject();
}
