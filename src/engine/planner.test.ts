import type { SessionState } from '@/session/state';
import { describe, expect, it } from 'vitest';
import {
    applyAdaptCommand,
    detectTopicDeviation,
    planAdaptation,
    validateAdaptCommand,
    type AdaptCommand,
    type PlanningContext
} from './planner';

// Mock de estado de sesión para pruebas
const createMockState = (overrides: Partial<SessionState> = {}): SessionState => ({
  planUrl: '/test/lesson.json',
  momentIdx: 0,
  stepIdx: 0,
  attemptsByAskCode: {},
  askedAskCodes: [],
  answeredAskCodes: [],
  done: false,
  dynamicQueue: [],
  budgetCentsLeft: 100,
  escalationsUsed: 0,
  adaptiveMode: true,
  ...overrides
});

// Mock de plan para pruebas
const createMockPlan = () => ({
  allSteps: [
    {
      type: 'ASK',
      code: 'ASK_001',
      objective: 'Identificar elementos de seguridad en trabajo en altura',
      data: {
        question: '¿Qué elementos de seguridad son necesarios para trabajo en altura?',
        acceptable_answers: ['arnés', 'cuerda', 'casco'],
        expected: ['arnés de seguridad', 'línea de vida', 'protección contra caídas']
      }
    },
    {
      type: 'ASK',
      code: 'ASK_002', 
      objective: 'Reconocer procedimientos de seguridad',
      data: {
        question: '¿Cuáles son los pasos del procedimiento de seguridad?',
        acceptable_answers: ['inspección', 'colocación', 'verificación'],
        expected: ['inspección previa', 'colocación correcta', 'verificación continua']
      }
    }
  ],
  contentCycles: [
    {
      contentStepIndex: 0,
      askStepIndices: [0, 1]
    }
  ]
});

describe('Planner', () => {
  describe('detectTopicDeviation', () => {
    it('debería detectar respuesta on-topic', () => {
      const step = { objective: 'Identificar elementos de seguridad en trabajo en altura' };
      const response = 'El arnés de seguridad es fundamental para el trabajo en altura';
      
      const result = detectTopicDeviation(response, step, step.objective);
      expect(result).toBe('ON_TOPIC');
    });

    it('debería detectar respuesta vaga', () => {
      const step = { objective: 'Identificar elementos de seguridad en trabajo en altura' };
      const response = 'Hay que tener cuidado con la seguridad';
      
      const result = detectTopicDeviation(response, step, step.objective);
      expect(result).toBe('VAGUE');
    });

    it('debería detectar respuesta off-topic', () => {
      const step = { objective: 'Identificar elementos de seguridad en trabajo en altura' };
      const response = 'El clima está muy bonito hoy';
      
      const result = detectTopicDeviation(response, step, step.objective);
      expect(result).toBe('OFF_TOPIC');
    });
  });

  describe('planAdaptation', () => {
    it('debería retornar null para pasos que no son ASK', () => {
      const state = createMockState();
      state.plan = createMockPlan();
      state.plan.allSteps[0].type = 'CONTENT';
      
      const context: PlanningContext = {
        state,
        shortHistory: [],
        budgetCentsLeft: 100,
        escalationsUsed: 0
      };
      
      const result = planAdaptation(context);
      expect(result).toBeNull();
    });

    it('debería sugerir hint cuando el presupuesto está agotado', () => {
      const state = createMockState();
      state.plan = createMockPlan();
      state.budgetCentsLeft = 5;
      
      const context: PlanningContext = {
        state,
        shortHistory: [],
        budgetCentsLeft: 5,
        escalationsUsed: 0
      };
      
      const result = planAdaptation(context);
      expect(result).toEqual({
        op: 'hint',
        reason: 'BUDGET_LIMIT',
        note: 'Presupuesto agotado, usando hint determinista'
      });
    });

    it('debería sugerir goto para respuestas off-topic', () => {
      const state = createMockState();
      state.plan = createMockPlan();
      
      const context: PlanningContext = {
        state,
        shortHistory: [{
          stepIdx: 0,
          action: 'ask',
          response: 'Hay que tener cuidado'
        }],
        budgetCentsLeft: 100,
        escalationsUsed: 0
      };
      
      const result = planAdaptation(context);
      expect(result?.op).toBe('goto');
      expect(result?.reason).toBe('OFF_TOPIC');
    });
  });

  describe('validateAdaptCommand', () => {
    it('debería validar comandos válidos', () => {
      const state = createMockState();
      const command: AdaptCommand = {
        op: 'hint',
        reason: 'SEM_LOW'
      };
      
      const result = validateAdaptCommand(command, state);
      expect(result).toBe(true);
    });

    it('debería rechazar comandos con targetAskCode inválido', () => {
      const state = createMockState();
      const command: AdaptCommand = {
        op: 'goto',
        targetAskCode: 'INVALID_CODE'
      };
      
      const result = validateAdaptCommand(command, state);
      expect(result).toBe(false);
    });
  });

  describe('applyAdaptCommand', () => {
    it('debería aplicar comando goto correctamente', () => {
      const state = createMockState();
      state.plan = createMockPlan();
      
      const command: AdaptCommand = {
        op: 'goto',
        targetAskCode: 'ASK_002'
      };
      
      const result = applyAdaptCommand(command, state);
      expect(result.stepIdx).toBe(1);
    });

    it('debería mantener estado para comandos que no modifican posición', () => {
      const state = createMockState();
      const command: AdaptCommand = {
        op: 'hint'
      };
      
      const result = applyAdaptCommand(command, state);
      expect(result.stepIdx).toBe(state.stepIdx);
    });

    it('debería rechazar comandos inválidos', () => {
      const state = createMockState();
      const command: AdaptCommand = {
        op: 'goto',
        targetAskCode: 'INVALID_CODE'
      };
      
      const result = applyAdaptCommand(command, state);
      expect(result).toEqual(state); // No debería cambiar el estado
    });
  });
});
