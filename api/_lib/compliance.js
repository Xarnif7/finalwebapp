/**
 * SMS compliance helpers
 */

function ensureFooter(message) {
  const footer = 'Reply STOP to opt out, HELP for help.';
  const lower = message.toLowerCase();
  if (lower.includes('reply stop') || lower.includes('help for help')) {
    return message;
  }
  return `${message.trim()} ${footer}`;
}

// Simple keyword matcher
const STOP_KEYWORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'];
const HELP_KEYWORDS = ['help', 'info'];

function matchesStopKeyword(body) {
  if (!body) return false;
  const text = String(body).trim().toLowerCase();
  return STOP_KEYWORDS.includes(text);
}

function matchesHelpKeyword(body) {
  if (!body) return false;
  const text = String(body).trim().toLowerCase();
  return HELP_KEYWORDS.includes(text);
}

module.exports = {
  ensureFooter,
  matchesStopKeyword,
  matchesHelpKeyword,
};


