import { create } from 'zustand';

export interface TestResult {
  accuracy: number;
  avgRT: number;
  rtVariability?: number;
  hits?: number;
  misses?: number;
  falseAlarms?: number;
  commissionErrors?: number;
  omissionErrors?: number;
  congruentRT?: number;
  incongruentRT?: number;
  interferenceScore?: number;
  maxSpan?: number;
  totalCorrect?: number;
  maxLevel?: number;
  dPrime?: number;
  accuracyPerLevel?: Record<number, number>;
  score?: number;
  riskLevel?: string;
  reactionTimes?: number[];
  meanRT?: number;
  medianRT?: number;
  fastest?: number;
  slowest?: number;
}

export interface DomainScores {
  attention: number;
  workingMemory: number;
  processingSpeed: number;
  impulseControl: number;
  coordination: number;
}

interface AssessmentState {
  results: Record<string, TestResult>;
  domainScores: DomainScores;
  completedTests: string[];
  setResult: (testId: string, result: TestResult) => void;
  setDomainScores: (scores: DomainScores) => void;
  markComplete: (testId: string) => void;
  reset: () => void;
}

const defaultDomainScores: DomainScores = {
  attention: 72,
  workingMemory: 65,
  processingSpeed: 80,
  impulseControl: 58,
  coordination: 70,
};

export const useAssessmentStore = create<AssessmentState>((set) => ({
  results: {},
  domainScores: defaultDomainScores,
  completedTests: [],
  setResult: (testId, result) =>
    set((state) => ({
      results: { ...state.results, [testId]: result },
    })),
  setDomainScores: (scores) => set({ domainScores: scores }),
  markComplete: (testId) =>
    set((state) => ({
      completedTests: state.completedTests.includes(testId)
        ? state.completedTests
        : [...state.completedTests, testId],
    })),
  reset: () =>
    set({ results: {}, domainScores: defaultDomainScores, completedTests: [] }),
}));

interface WearableState {
  isConnected: boolean;
  deviceName: string | null;
  heartRate: number;
  hrv: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  setConnected: (connected: boolean, deviceName?: string) => void;
  setHeartRate: (hr: number) => void;
  setHRV: (hrv: number) => void;
  setAccel: (x: number, y: number, z: number) => void;
}

export const useWearableStore = create<WearableState>((set) => ({
  isConnected: false,
  deviceName: null,
  heartRate: 72,
  hrv: 45,
  accelX: 0,
  accelY: 0,
  accelZ: 0,
  setConnected: (connected, deviceName) =>
    set({ isConnected: connected, deviceName: deviceName || null }),
  setHeartRate: (hr) => set({ heartRate: hr }),
  setHRV: (hrv) => set({ hrv }),
  setAccel: (x, y, z) => set({ accelX: x, accelY: y, accelZ: z }),
}));

interface UserState {
  name: string;
  age: number;
  baselineScores: DomainScores | null;
  setUser: (name: string, age: number) => void;
  setBaseline: (scores: DomainScores) => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: 'Ahmed Al-Rashid',
  age: 16,
  baselineScores: null,
  setUser: (name, age) => set({ name, age }),
  setBaseline: (scores) => set({ baselineScores: scores }),
}));
