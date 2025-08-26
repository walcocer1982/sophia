import React from 'react';
import FeedbackSequential from '@/components/FeedbackSequential';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

function setInput(root: TestRenderer.ReactTestRenderer['root'], value: string) {
  const input = root.findAll((n) => n.type === 'input')[0];
  act(() => input.props.onChange({ target: { value } }));
}

function clickSend(root: TestRenderer.ReactTestRenderer['root']) {
  const btn = root.findAll((n) => n.type === 'button')[0];
  act(() => btn.props.onClick());
}

function getLabels(root: TestRenderer.ReactTestRenderer['root']): string[] {
  const nodes = root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('font-semibold'));
  return nodes.map((n) => (Array.isArray(n.children) ? n.children.join('') : String(n.children || '')));
}

function getKinds(root: TestRenderer.ReactTestRenderer['root']): string[] {
  const nodes = root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('uppercase'));
  return nodes.map((n) => (Array.isArray(n.children) ? n.children.join('') : String(n.children || '')));
}

function getLastFeedback(root: TestRenderer.ReactTestRenderer['root']): string {
  const nodes = root.findAll((n) => n.type === 'div' && String(n.props.className || '').includes('whitespace-pre-wrap'));
  const last = nodes[nodes.length - 1];
  if (!last) return '';
  return Array.isArray(last.children) ? last.children.join('') : String(last.children || '');
}

describe('FeedbackSequential UI', () => {
  it('mapea HINT a F0/F1 según intento (F0 en intentos 0 y 1, F1 en 2)', () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FeedbackSequential
          code="T-Q01"
          prompts={[
            'P0: pregunta',
            'P1: reintento',
            'P2: último'
          ]}
          objective="objetivo"
          acceptable={[]}
          expected={[]}
          answerType="list"
        />
      );
    });
    const root = (renderer as TestRenderer.ReactTestRenderer).root;

    // intento 0: vacío → HINT → F0
    setInput(root, '');
    clickSend(root);
    expect(getLabels(root)).toEqual(['F0']);
    expect(getKinds(root)[0]).toBe('HINT');

    // intento 1: basura → HINT → F0
    setInput(root, '???');
    clickSend(root);
    expect(getLabels(root)).toEqual(['F0', 'F0']);

    // intento 2: basura → HINT → F1
    setInput(root, 'lorem ipsum');
    clickSend(root);
    expect(getLabels(root)).toEqual(['F0', 'F0', 'F1']);
    expect(getKinds(root)[2]).toBe('HINT');
  });

  it('PARTIAL y ACCEPT se etiquetan F2 y completan acorde', () => {
    let onComplete = vi.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FeedbackSequential
          code="T-Q02"
          prompts={[
            'P0', 'P1', 'P2'
          ]}
          objective="definir semilla"
          acceptable={["56"]}
          expected={["semilla"]}
          answerType="definition"
          onComplete={onComplete}
        />
      );
    });
    const root = (renderer as TestRenderer.ReactTestRenderer).root;

    // PARTIAL por expected
    setInput(root, 'La semilla...');
    clickSend(root);
    expect(getLabels(root)).toEqual(['F2']);
    expect(getKinds(root)[0]).toBe('PARTIAL');
    expect(onComplete).not.toHaveBeenCalled();

    // ACCEPT por acceptable
    setInput(root, '56');
    clickSend(root);
    const labels = getLabels(root);
    expect(labels[labels.length - 1]).toBe('F2');
    const kinds = getKinds(root);
    expect(kinds[kinds.length - 1]).toBe('ACCEPT');
    expect(onComplete).toHaveBeenCalledTimes(1);
    const call = onComplete.mock.calls[0][0];
    expect(call.status).toBe('cumplida');
    expect(call.score).toBe(2);
  });

  it('al agotar intentos con finalExplanation agrega F2 final y emite force_advance', () => {
    let onComplete = vi.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FeedbackSequential
          code="T-Q03"
          prompts={[ 'P0', 'P1', 'P2' ]}
          objective="objetivo"
          acceptable={["respuesta-correcta"]}
          expected={[]}
          answerType="list"
          finalExplanation="Explicación de cierre"
          onComplete={onComplete}
        />
      );
    });
    const root = (renderer as TestRenderer.ReactTestRenderer).root;

    // Tres intentos fallidos
    setInput(root, 'foo'); clickSend(root);
    setInput(root, 'bar'); clickSend(root);
    setInput(root, 'baz'); clickSend(root);

    const labels = getLabels(root);
    // deberían ser: F0, F0, F1, F2 (cierre)
    expect(labels).toEqual(['F0', 'F0', 'F1', 'F2']);
    const lastText = getLastFeedback(root);
    expect(lastText).toContain('Explicación de cierre');

    expect(onComplete).toHaveBeenCalledTimes(1);
    const call = onComplete.mock.calls[0][0];
    expect(call.status).toBe('force_advance');
    expect(call.score === 0 || call.score === 1).toBe(true);
  });
});



