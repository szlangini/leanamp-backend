import type { AiActivityEstimateInput, AiFoodDescribeInput, AiInsightsInput } from './schemas';

export const PROMPT_VERSION = 'v1';

const baseRules = [
  'You must output valid JSON only.',
  'No markdown, no extra keys, no trailing comments.',
  'Be concise, supportive, and critical without demotivating.',
  'If data is missing or unclear, add a warning instead of guessing.'
].join(' ');

export function buildInsightsPrompt(input: AiInsightsInput) {
  return [
    baseRules,
    'Use tokens [OK], [WARN], [FIX] optionally in bullet text for emphasis.',
    'Return schema:',
    '{"status":"OK","overall":"POS|NEU|NEG","bullets":[{"k":"CAL|PROTEIN|WATER|MOVE|STRENGTH|RECOVERY","s":"P1|P2|P3","t":"string"}],"actions":[{"t":"string","p":"HIGH|MED|LOW"}],"warnings":["string"],"disclaimer":"ESTIMATE"}',
    'Limits: bullets max 5, actions max 3.',
    'If something is going well, say it explicitly.',
    'Input JSON:',
    JSON.stringify(input)
  ].join('\n');
}

export function buildActivityPrompt(input: AiActivityEstimateInput) {
  return [
    baseRules,
    'If weightKg is missing, assume 80kg and mention in notes.',
    'Return schema:',
    '{"status":"OK","kcal":int,"confidence":0..1,"notes":"string","disclaimer":"ESTIMATE"}',
    'Input JSON:',
    JSON.stringify(input)
  ].join('\n');
}

export function buildFoodDescribePrompt(input: AiFoodDescribeInput, mode: 'text' | 'voice') {
  return [
    baseRules,
    'Return schema:',
    '{"status":"OK","mealName":"string","parsed":"string","kcal":int,"protein":float,"fat":float,"carbs":float,"fiber":float|null,"confidence":0..1,"questions":["string"],"disclaimer":"ESTIMATE"}',
    'Rules:',
    '- mealName: short, TitleCase, no punctuation.',
    '- parsed: one line, concise interpretation.',
    '- questions max 2; ask only if missing portions/ingredients.',
    '- If vague, set confidence <= 0.3 and ask a question.',
    mode === 'voice'
      ? '- Always include parsed and at most 2 questions.'
      : '- Always include parsed and at most 2 questions.',
    'Input JSON:',
    JSON.stringify(input)
  ].join('\n');
}

export function buildFoodPhotoPrompt(locale?: string) {
  return [
    baseRules,
    'You will be given a food photo.',
    'If sexual content or nudity is present, return {"status":"SEXUAL_CONTENT","reason":"string"}.',
    'If the image is not food, return {"status":"NOT_FOOD","reason":"string"}.',
    'Otherwise return schema:',
    '{"status":"OK","mealName":"string","parsed":"string","kcal":int,"protein":float,"fat":float,"carbs":float,"fiber":float|null,"confidence":0..1,"questions":["string"],"disclaimer":"ESTIMATE"}',
    'Rules:',
    '- mealName: short, TitleCase, no punctuation.',
    '- parsed: one line, concise interpretation.',
    '- questions max 2; ask only if missing portions/ingredients.',
    '- If vague, set confidence <= 0.3 and ask a question.',
    locale ? `Locale: ${locale}` : 'Locale: unknown'
  ].join('\n');
}

export function buildBodyfatPrompt(locale?: string) {
  return [
    baseRules,
    'You will be given a body photo for body fat estimation.',
    'If sexual content or nudity is present, return {"status":"SEXUAL_CONTENT","reason":"string"}.',
    'If no body/person is visible, return {"status":"NO_BODY","reason":"string"}.',
    'Otherwise return schema:',
    '{"status":"OK","bodyFatPct":float,"confidence":0..1,"notes":"string","disclaimer":"ESTIMATE"}',
    'Rules:',
    '- Keep notes short and neutral.',
    locale ? `Locale: ${locale}` : 'Locale: unknown'
  ].join('\n');
}
