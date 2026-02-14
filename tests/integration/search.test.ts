import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleSearchContext } from '@/background/handlers/searchContext';
import { db, addSlice } from '@/background/db';

describe('Integration: Search Context', () => {
    beforeEach(async () => {
        // Clear DB
        await db.delete();
        await db.open();

        // Populate with test data
        await addSlice({
            id: "slice-1",
            url: "https://example.com/page1",
            title: "React Hooks Guide",
            text: "Learn about useState and useEffect hooks in React.",
            position: 0
        });

        await addSlice({
            id: "slice-2",
            url: "https://example.com/page2",
            title: "Advanced React Patterns",
            text: "Higher order components and render props are advanced patterns.",
            position: 0
        });

        await addSlice({
            id: "slice-3",
            url: "https://vuejs.org/guide",
            title: "Vue.js Introduction",
            text: "Vue is a progressive framework for building user interfaces.",
            position: 0
        });
    });

    afterEach(async () => {
        // Cleanup
        await db.delete();
    });

    it('should return relevant results based on keyword match', async () => {
        const result = await handleSearchContext({ query: "react hooks" });

        expect(result.results).toBeDefined();
        expect(result.results!.length).toBeGreaterThan(0);

        // First result should be the most relevant (contains both "React" and "hooks")
        expect(result.results![0].title).toBe("React Hooks Guide");
    });

    it('should return results when searching by url', async () => {
        const result = await handleSearchContext({ query: "", url: "https://vuejs.org/guide" });
        expect(result.results).toHaveLength(1);
        expect(result.results![0].title).toBe("Vue.js Introduction");
    });

    it('should handle empty results gracefully', async () => {
        const result = await handleSearchContext({ query: "angular" });
        expect(result.results).toEqual([]);
    });
});
