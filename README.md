# 💬 TalkWithBookmarks 🔖

I am an avid internet reader and found myslef bookmarking and reading a lot of pages. I wanted to have a way to chat with my bookmarks and get the answers from the bookmarks. So I created this extension.
Will probably add more features in the future like talk with history, or knowledge graph, but for now it is a simple extension that lets you chat with your bookmarks.
TalkWithBookmarks is a browser extension that lets you chat with your bookmarked pages, get summaries, and find information using the power of AI. Stop wondering why you saved a link—just ask it!

## ✨ Features

- **Chat with Your Bookmarks**: Ask questions in a natural, conversational way about the content of pages you've saved.
- **AI-Powered Summaries**: Get quick and concise summaries of long articles without having to re-read them.
- **Local-First AI**: Utilizes WebLLM to run the language model directly in your browser, keeping your data private.
- **Automatic Indexing**: Your bookmarks are automatically downloaded, processed, and stored locally for fast and efficient searching.

## 🚀 Getting Started (for Developers)

Follow these instructions to set up the development environment.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installing

1. Use the link in the releases section page or [https://github.com/dailypixie/talkwithbookmarks/releases](https://github.com/dailypixie/talkwithbookmarks/releases) to download the extension zip file.
2. Unzip the file.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** using the toggle in the top-right corner.
5. Click **Load unpacked**.
6. Select the unzipped folder.
7. The extension will now be active and will update automatically as you make changes.

### Using the extension

1. Use the extension icon to open start indexing the bookmarks.
2. Once the indexing is complete, you can start chatting with the bookmarks.
3. In any page you can use chat bubble to chat with the current page and get the answers from the bookmarks.

### Giving Feedback

If you have any feedback, suggestions, or encounter any issues, please feel free to open an issue on this repository. Your input is invaluable in helping us improve the extension!

### Development Steps

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/your-username/talkwithbookmarks.git
    cd talkwithbookmarks
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Start the Development Server**:
    This command will watch for file changes and rebuild the extension automatically.

    ```bash
    npm run watch
    ```

4.  **Load the Extension in Chrome**:
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable **Developer mode** using the toggle in the top-right corner.
    - Click **Load unpacked**.
    - Select the `dist` directory that was created in the project folder.
    - The extension will now be active and will update automatically as you make changes.

## 📦 Building for Production

To create a production-ready build of the extension, run the following command:

```bash
npm run build
```

This will generate a clean, optimized `dist` directory, which you can then use to install the extension.
