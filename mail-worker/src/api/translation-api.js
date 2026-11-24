import app from '../hono/hono';
import result from '../model/result';
import BizError from '../error/biz-error';
import { parseHTML } from 'linkedom';

const MAX_TRANSLATION_LENGTH = 20000;
const REMOVED_TAGS = 'script,style,iframe,object,embed,form,input,button,link,meta,base,svg,math';

function sanitizeHtmlForTranslation(html) {
	const { document } = parseHTML(`<html><body>${html}</body></html>`);
	document.querySelectorAll(REMOVED_TAGS).forEach(node => node.remove());
	for (const element of document.body.querySelectorAll('*')) {
		for (const attribute of [...element.attributes]) {
			const name = attribute.name.toLowerCase();
			if (name.startsWith('on') || ['href', 'src', 'srcset', 'action', 'formaction'].includes(name)) {
				element.removeAttribute(attribute.name);
			}
		}
	}
	return document.body.innerHTML;
}

app.post('/translation/google', async (c) => {
	const apiKey = c.env.GOOGLE_TRANSLATE_API_KEY;
	if (!apiKey) {
		throw new BizError('Google Translation is not configured', 503);
	}

	const body = await c.req.json();
	if (typeof body.content !== 'string' || !body.content.trim()) {
		throw new BizError('Email content is empty', 400);
	}
	if (body.content.length > MAX_TRANSLATION_LENGTH) {
		throw new BizError('Email content exceeds the translation limit', 413);
	}

	const format = body.format === 'html' ? 'html' : 'text';
	const content = format === 'html' ? sanitizeHtmlForTranslation(body.content) : body.content;
	const requestBody = {
		q: [content],
		target: 'zh-CN',
		format
	};
	const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-goog-api-key': apiKey
		},
		body: JSON.stringify(requestBody),
		signal: AbortSignal.timeout(20000)
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) {
		const googleError = data?.error;
		const reason = googleError?.message || googleError?.status || `HTTP ${response.status}`;
		console.error('Google Translation request failed', {
			status: response.status,
			reason: googleError?.message || googleError?.status || 'unknown'
		});
		throw new BizError(`Google Translation failed: ${reason}`, 502);
	}

	const translatedText = data?.data?.translations?.[0]?.translatedText;
	if (typeof translatedText !== 'string') {
		throw new BizError('Google Translation returned an invalid response', 502);
	}
	return c.json(result.ok({ translatedText }));
});
