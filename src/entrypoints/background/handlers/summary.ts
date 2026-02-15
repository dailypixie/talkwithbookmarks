import { getPageByUrl, updatePageSummary } from '@/entrypoints/background/db';
import { sendMessageToOffscreenWithRetry } from '@/entrypoints/background/offscreen';
import { backgroundLogger as logger } from '@/utils/logger';
import { SUMMARY_CONFIG } from '@/utils/constants';
import { MessageAction } from '@/utils/types';

export async function handleGetPageSummary(url: string): Promise<{ summary: string | null; summaryModel?: string; exists: boolean }> {
  try {
    const page = await getPageByUrl(url);
    if (page?.summary) {
      return { summary: page.summary as string, summaryModel: page.summaryModel as string | undefined, exists: true };
    }
    return { summary: null, exists: !!page };
  } catch (e) {
    logger.error('GetPageSummary error', e as Error);
    return { summary: null, exists: false };
  }
}

export async function handleGenerateSummary(
  url: string,
  content: string,
  title: string
): Promise<{ summary: string | null; summaryModel?: string; error?: string }> {
  try {
    const statusResponse = (await sendMessageToOffscreenWithRetry({ action: MessageAction.OFFSCREEN_GET_STATUS })) as { currentModel?: string };
    const currentModel = statusResponse?.currentModel;

    const truncatedContent =
      content.length > SUMMARY_CONFIG.MAX_CONTENT_LENGTH ? content.slice(0, SUMMARY_CONFIG.MAX_CONTENT_LENGTH) + '...' : content;

    const prompt = `/no_think
Summarize this webpage in 2-3 concise paragraphs. Focus on the main points and key takeaways.

Title: ${title}
URL: ${url}

Content:
${truncatedContent}

Summary:`;

    const response = (await sendMessageToOffscreenWithRetry({
      action: MessageAction.OFFSCREEN_CHAT,
      messages: [{ role: 'user', content: prompt }],
    })) as { response?: string; error?: string };

    if (response?.response) {
      const summary = response.response.trim();
      await updatePageSummary(url, summary, currentModel);
      logger.info('Generated and saved summary', { url, summaryLength: summary.length, model: currentModel });
      return { summary, summaryModel: currentModel };
    }

    const errorMessage = response?.error ?? 'No response from LLM. Make sure a model is loaded.';
    return { summary: null, error: errorMessage };
  } catch (e) {
    logger.error('GenerateSummary error', e as Error);
    return { summary: null, error: String(e) };
  }
}
