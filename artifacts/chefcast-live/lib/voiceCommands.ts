/**
 * Voice Commands System for ChefCast: Live
 * 
 * Enables hands-free navigation during live quiz sessions.
 * Uses Expo Speech Recognition for voice input and Text-to-Speech for feedback.
 * 
 * Supported Commands:
 * - "Answer A/B/C/D" - Selects and submits the corresponding answer option
 * - "Leaderboard" - Opens the current leaderboard sheet
 * - "My rank" - Reads aloud the viewer's current rank and score
 * - "How long" - Reads aloud the remaining time on the current question timer
 * - "Tips" - Switches to the Tips tab in the episode panel
 * - "Home" - Navigates back to the home screen
 */

import * as Speech from 'expo-speech';

/**
 * Voice command types
 */
export type VoiceCommand =
  | 'ANSWER_A'
  | 'ANSWER_B'
  | 'ANSWER_C'
  | 'ANSWER_D'
  | 'LEADERBOARD'
  | 'MY_RANK'
  | 'HOW_LONG'
  | 'TIPS'
  | 'HOME'
  | 'UNKNOWN';

/**
 * Voice command patterns for recognition
 */
const COMMAND_PATTERNS: Record<VoiceCommand, RegExp[]> = {
  ANSWER_A: [/answer\s+a/i, /option\s+a/i, /select\s+a/i, /choose\s+a/i, /^a$/i],
  ANSWER_B: [/answer\s+b/i, /option\s+b/i, /select\s+b/i, /choose\s+b/i, /^b$/i],
  ANSWER_C: [/answer\s+c/i, /option\s+c/i, /select\s+c/i, /choose\s+c/i, /^c$/i],
  ANSWER_D: [/answer\s+d/i, /option\s+d/i, /select\s+d/i, /choose\s+d/i, /^d$/i],
  LEADERBOARD: [/leaderboard/i, /show\s+leaderboard/i, /rankings/i, /show\s+rankings/i],
  MY_RANK: [/my\s+rank/i, /what's\s+my\s+rank/i, /my\s+score/i, /my\s+position/i],
  HOW_LONG: [/how\s+long/i, /time\s+left/i, /remaining\s+time/i, /how\s+much\s+time/i],
  TIPS: [/tips/i, /show\s+tips/i, /help/i],
  HOME: [/home/i, /go\s+home/i, /back\s+home/i, /exit/i],
  UNKNOWN: [],
};

/**
 * Parse voice input and return the matched command
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const normalizedInput = input.trim().toLowerCase();

  for (const [command, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedInput)) {
        return command as VoiceCommand;
      }
    }
  }

  return 'UNKNOWN';
}

/**
 * Speak text using Text-to-Speech
 */
export async function speak(text: string, options?: Speech.SpeechOptions): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
      onDone: () => resolve(),
      onError: () => resolve(),
      ...options,
    });
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * Check if Text-to-Speech is available
 */
export async function isSpeechAvailable(): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.length > 0;
  } catch {
    return false;
  }
}

/**
 * Voice command handler interface
 */
export interface VoiceCommandHandler {
  onAnswerSelected: (option: 'A' | 'B' | 'C' | 'D') => void;
  onLeaderboardRequested: () => void;
  onRankRequested: () => void;
  onTimeRequested: () => void;
  onTipsRequested: () => void;
  onHomeRequested: () => void;
}

/**
 * Process a voice command and execute the appropriate action
 */
export async function processVoiceCommand(
  command: VoiceCommand,
  handler: VoiceCommandHandler,
  context?: {
    currentRank?: number;
    currentScore?: number;
    timeRemaining?: number;
  }
): Promise<void> {
  switch (command) {
    case 'ANSWER_A':
      handler.onAnswerSelected('A');
      await speak('Answer A selected');
      break;

    case 'ANSWER_B':
      handler.onAnswerSelected('B');
      await speak('Answer B selected');
      break;

    case 'ANSWER_C':
      handler.onAnswerSelected('C');
      await speak('Answer C selected');
      break;

    case 'ANSWER_D':
      handler.onAnswerSelected('D');
      await speak('Answer D selected');
      break;

    case 'LEADERBOARD':
      handler.onLeaderboardRequested();
      await speak('Opening leaderboard');
      break;

    case 'MY_RANK':
      handler.onRankRequested();
      if (context?.currentRank && context?.currentScore) {
        await speak(
          `You are currently ranked ${context.currentRank} with ${context.currentScore} points`
        );
      } else {
        await speak('Rank information not available');
      }
      break;

    case 'HOW_LONG':
      handler.onTimeRequested();
      if (context?.timeRemaining !== undefined) {
        await speak(`${context.timeRemaining} seconds remaining`);
      } else {
        await speak('No active question');
      }
      break;

    case 'TIPS':
      handler.onTipsRequested();
      await speak('Showing tips');
      break;

    case 'HOME':
      handler.onHomeRequested();
      await speak('Going home');
      break;

    case 'UNKNOWN':
      await speak('Command not recognized. Try saying answer A, leaderboard, or my rank');
      break;
  }
}

/**
 * Voice command feedback messages
 */
export const VOICE_FEEDBACK = {
  LISTENING: 'Listening...',
  PROCESSING: 'Processing command...',
  ERROR: 'Sorry, I didn\'t catch that. Please try again.',
  DISABLED: 'Voice commands are disabled. Enable them in settings.',
  NOT_AVAILABLE: 'Voice commands are not available on this device.',
} as const;

/**
 * Voice command help text
 */
export const VOICE_COMMANDS_HELP = `
Available voice commands:

• "Answer A/B/C/D" - Select and submit an answer
• "Leaderboard" - View current rankings
• "My rank" - Hear your current position
• "How long" - Hear remaining time
• "Tips" - View helpful tips
• "Home" - Return to home screen

Tip: Speak clearly and wait for the microphone icon to appear before giving a command.
`.trim();

/**
 * Example usage:
 * 
 * ```typescript
 * import { parseVoiceCommand, processVoiceCommand } from '@/lib/voiceCommands';
 * 
 * // In your component:
 * const handleVoiceInput = async (transcript: string) => {
 *   const command = parseVoiceCommand(transcript);
 *   
 *   await processVoiceCommand(command, {
 *     onAnswerSelected: (option) => {
 *       // Handle answer selection
 *       selectAnswer(option);
 *     },
 *     onLeaderboardRequested: () => {
 *       // Show leaderboard
 *       setShowLeaderboard(true);
 *     },
 *     onRankRequested: () => {
 *       // Rank will be spoken automatically
 *     },
 *     onTimeRequested: () => {
 *       // Time will be spoken automatically
 *     },
 *     onTipsRequested: () => {
 *       // Show tips
 *       navigation.navigate('Tips');
 *     },
 *     onHomeRequested: () => {
 *       // Navigate home
 *       navigation.navigate('Home');
 *     },
 *   }, {
 *     currentRank: 7,
 *     currentScore: 850,
 *     timeRemaining: 15,
 *   });
 * };
 * ```
 */
