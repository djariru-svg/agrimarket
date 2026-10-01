export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s0-9]{8,15}$/.test(phone.replace(/\s+/g, ''));
}

export function validatePrice(price) {
  const parsed = Number(price);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100000000;
}

export function sanitizeText(text) {
  if (!text) return '';
  return String(text).trim();
}
