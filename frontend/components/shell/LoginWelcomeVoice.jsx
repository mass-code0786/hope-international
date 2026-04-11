'use client';

import { useEffect } from 'react';
import {
  buildWelcomeVoiceMessage,
  cancelSpeechSynthesis,
  getWelcomeVoiceState,
  markWelcomeVoicePlayed
} from '@/lib/utils/welcomeVoice';

function isReloadNavigation() {
  if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
    return false;
  }

  const [navigationEntry] = window.performance.getEntriesByType?.('navigation') || [];
  if (navigationEntry?.type) {
    return navigationEntry.type === 'reload';
  }

  return window.performance.navigation?.type === 1;
}

export function LoginWelcomeVoice({ username }) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return undefined;
    if (getWelcomeVoiceState() !== 'pending') return undefined;

    if (isReloadNavigation()) {
      markWelcomeVoicePlayed();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const message = buildWelcomeVoiceMessage(username);
      markWelcomeVoicePlayed();
      if (!message) return;

      cancelSpeechSynthesis();

      const utterance = new window.SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [username]);

  return null;
}
