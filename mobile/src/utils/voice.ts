export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // évite l'empilement si tap répété
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  window.speechSynthesis.speak(u);
}
