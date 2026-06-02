export const SIDEBAR_QUOTES = [
  "Consistency beats intensity. Keep going. 💙",
  "Every hour you study now is a life you'll save later. 🩺",
  "You didn't come this far to only come this far. 💪",
  "Future doctor in the making. 🩺✨",
  "Study like you're going to save a life... because you are. ❤️",
  "You are capable of doing hard things, Baby!",
  "Take it one concept at a time. You've got this. 🧠",
  "Success isn't overnight, it's every single day."
];

export const CHEESY_LOVE_QUOTES = [
  "You've got this, future doctor! 🩺❤️",
  "Are you Epinephrine? Because you make my heart race! ⚡💓",
  "You must be made of copper and tellurium, because you are CuTe! 💕",
  "My heart beats in sinus rhythm just thinking about you. 📈❤️",
  "Just like a myelin sheath, you make my thoughts run faster! 🧠⚡",
  "Every page you read is a patient you'll save. I'm so proud of you, Baby.",
  "You are the primary caregiver of my heart. 🩺",
  "In a world of arrhythmia, you are my sinus rhythm. 💓",
  "Baby, you are going to be the most compassionate, brilliant doctor. Keep going!",
  "Your dedication is inspiring. Take a deep breath — you're doing amazing! 🥰",
  "You're not just studying for an exam; you're building a legacy. 🌟",
  "Rest if you must, but don't you quit. I believe in you! 💙"
];

export function getRandomSidebarQuote(): string {
  const idx = Math.floor(Math.random() * SIDEBAR_QUOTES.length);
  return SIDEBAR_QUOTES[idx];
}

export function getRandomLoveQuote(): string {
  const idx = Math.floor(Math.random() * CHEESY_LOVE_QUOTES.length);
  return CHEESY_LOVE_QUOTES[idx];
}
