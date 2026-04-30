import * as Speech from 'expo-speech';

export const voiceCommands = {
  speak: (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  },

  stop: () => {
    Speech.stop();
  },

  announceStep: (stepNumber: number, instruction: string) => {
    voiceCommands.speak(`Step ${stepNumber}. ${instruction}`);
  },

  announceTimer: (minutes: number) => {
    voiceCommands.speak(`Timer set for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  },

  announceCompletion: () => {
    voiceCommands.speak('Step completed! Great job!');
  },
};
