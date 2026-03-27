export function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

export function expenseRecorded(description: string, amount: number, categoryName: string, categoryIcon: string, remaining: number): string {
  return [
    `✅ נרשם: ${description} ${formatCurrency(amount)}`,
    `📂 קטגוריה: ${categoryIcon} ${categoryName}`,
    `💰 נשאר החודש: ${formatCurrency(remaining)}`,
  ].join('\n');
}

export function statusMessage(remaining: number, total: number, percent: number): string {
  return [
    `💰 נשאר החודש: ${formatCurrency(remaining)} מתוך ${formatCurrency(total)}`,
    `📊 ניצלת ${percent}% מהתקציב`,
  ].join('\n');
}

export function historyMessage(expenses: { description: string; amount: number; categoryIcon: string; createdAt: Date }[]): string {
  if (expenses.length === 0) return '📭 אין הוצאות החודש';

  const lines = expenses.map((e, i) => {
    const date = `${e.createdAt.getDate().toString().padStart(2, '0')}/${(e.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${i + 1}. ${e.categoryIcon} ${e.description} — ${formatCurrency(e.amount)} (${date})`;
  });

  return `📋 10 הוצאות אחרונות:\n${lines.join('\n')}`;
}

export function loanMessage(paid: number, total: number, monthsLeft: number): string {
  return [
    `📋 הלוואה: שילמת ${formatCurrency(paid)} מתוך ${formatCurrency(total)}`,
    `📅 נותרו ${monthsLeft} חודשים`,
  ].join('\n');
}

export function summaryMessage(
  income: number,
  fixed: number,
  loanPayment: number,
  variable: number,
  remaining: number,
  categories: { icon: string; name: string; total: number }[],
): string {
  const catLines = categories
    .filter((c) => c.total > 0)
    .map((c) => `  ${c.icon} ${c.name}: ${formatCurrency(c.total)}`);

  return [
    `📊 סיכום חודשי`,
    ``,
    `💰 הכנסות: ${formatCurrency(income)}`,
    `📌 הוצאות קבועות: ${formatCurrency(fixed)}`,
    `📋 החזר הלוואה: ${formatCurrency(loanPayment)}`,
    `🛒 הוצאות משתנות: ${formatCurrency(variable)}`,
    ``,
    `📂 לפי קטגוריה:`,
    ...catLines,
    ``,
    `💰 נשאר: ${formatCurrency(remaining)}`,
  ].join('\n');
}

export function confirmHighAmount(amount: number): string {
  return `⚠️ בטוח? הסכום הוא ${formatCurrency(amount)}. שלח "כן" לאישור או כל דבר אחר לביטול.`;
}

export function budgetAlert(threshold: number, remaining: number, total: number): string {
  return [
    `⚠️ שים לב! הגעת ל-${threshold}% מהתקציב החודשי.`,
    `💰 נשאר: ${formatCurrency(remaining)} מתוך ${formatCurrency(total)}`,
  ].join('\n');
}

export function undoMessage(description: string, amount: number, remaining: number): string {
  return `↩️ בוטל: ${description} ${formatCurrency(amount)}\n💰 נשאר החודש: ${formatCurrency(remaining)}`;
}

export function exportMessage(month: number, year: number, expenses: { description: string; amount: number; categoryIcon: string; createdAt: Date }[], total: number): string {
  if (expenses.length === 0) return `📭 אין הוצאות ב-${month}/${year}`;

  const lines = expenses.map((e) => {
    const date = `${e.createdAt.getDate().toString().padStart(2, '0')}/${(e.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${e.categoryIcon} ${e.description} — ${formatCurrency(e.amount)} (${date})`;
  });

  return [
    `📤 ייצוא הוצאות ${month}/${year}`,
    `סה"כ: ${formatCurrency(total)} (${expenses.length} הוצאות)`,
    ``,
    ...lines,
  ].join('\n');
}

export const WELCOME_MESSAGE = `👋 ברוך הבא ל-NivBudget!

כדי לרשום הוצאה, פשוט שלח הודעה בפורמט:
📝 תיאור סכום

דוגמאות:
☕ קפה 15
🛒 סופר 280
⛽ דלק 350

פקודות זמינות:
/status — מצב התקציב
/history — 10 הוצאות אחרונות
/summary — סיכום חודשי
/loan — מצב ההלוואה
/undo — ביטול הוצאה אחרונה
/export — ייצוא חודשי
/help — עזרה`;

export const HELP_MESSAGE = `📖 עזרה — NivBudget

📝 רישום הוצאה:
שלח הודעה עם תיאור וסכום:
  קפה 15
  סופר רמי לוי 280
  350 דלק

📋 פקודות:
/status — כמה נשאר החודש
/history — 10 הוצאות אחרונות
/summary — סיכום חודשי מפורט
/loan — מצב החזר ההלוואה
/undo — ביטול הוצאה אחרונה (עד 5 דקות)
/export — ייצוא הוצאות החודש
/export 3 2026 — ייצוא חודש ספציפי
/cancel — ביטול פעולה ממתינה
/connect <token> — חיבור חשבון צפייה
/help — הודעה זו`;

export const TEXT_ONLY_MESSAGE = 'אני מקבל רק הודעות טקסט 😊';
export const PARSE_ERROR_MESSAGE = 'לא הבנתי. שלח הוצאה בפורמט: תיאור סכום (למשל: קפה 15)';
export const UNKNOWN_COMMAND_MESSAGE = 'פקודה לא מוכרת. שלח /help לרשימת פקודות';
export const DB_ERROR_MESSAGE = 'משהו השתבש, נסה שוב 😕';
export const CANCEL_MESSAGE = '❌ בוטל';
export const NO_PENDING_MESSAGE = 'אין פעולה ממתינה לביטול';
export const OWNER_REGISTERED_MESSAGE = '✅ חשבון בעלים חובר בהצלחה!';
export const ALREADY_REGISTERED_MESSAGE = 'החשבון כבר מחובר. אם את/ה צופה, שלח /connect <token>';
export const CONNECT_SUCCESS_MESSAGE = '✅ חשבון צפייה חובר בהצלחה!';
export const CONNECT_INVALID_MESSAGE = '❌ טוקן לא תקין';
export const UNDO_TOO_LATE_MESSAGE = '⏰ אפשר לבטל רק עד 5 דקות אחרי הרישום';
export const UNDO_NOTHING_MESSAGE = '📭 אין הוצאה אחרונה לביטול';
