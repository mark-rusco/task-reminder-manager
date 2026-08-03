/**
 * Turns Supabase auth errors into human-readable, actionable messages.
 * The auth service sometimes returns an HTTP error with an empty `{}` body
 * (e.g. SMTP send failures surface as a 500 with no JSON), so we map by
 * status code and fall back gracefully instead of printing "{}".
 */
export function friendlyAuthError(error) {
  if (!error) return '';
  const status = typeof error.status === 'number' ? error.status : null;
  const raw = typeof error.message === 'string' ? error.message.trim() : '';
  const hasRealMessage = raw !== '' && raw !== '{}' && raw !== 'undefined';

  if (status === 429) {
    return 'Too many requests — please wait a minute and try again.';
  }
  if (status === 422 && !hasRealMessage) {
    return 'The request was rejected. Check that the email is valid and that the redirect URL is allowed under Supabase → Authentication → URL Configuration.';
  }
  if (status !== null && status >= 500) {
    return 'Supabase could not send the email (HTTP ' + status + '). Check Authentication → Logs for the failed request — this is usually an SMTP / email provider configuration issue.';
  }
  if (!hasRealMessage) {
    return 'Supabase could not complete the request. Check Authentication → Logs for details — an empty response usually means an SMTP / email provider issue.';
  }
  return raw;
}