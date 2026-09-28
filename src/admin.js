// Accounts here bypass every future free-tier limit/paywall and can see
// the special admin view. Nothing else reads this list — Supabase's RLS
// (admin_list_trips) does its own server-side check on the same email.
const ADMIN_EMAILS = ["patelgaurav77@gmail.com"];

export function isAdmin(session) {
  return !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
}
