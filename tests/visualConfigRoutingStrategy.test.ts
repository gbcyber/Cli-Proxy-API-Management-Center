import { describe, expect, test } from 'bun:test';
import { createElement, useState, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse as parseYaml } from 'yaml';
import { parseRoutingStrategy, useVisualConfig } from '../src/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES, type RoutingStrategy } from '../src/types/visualConfig';

const { I18nextProvider } = await import('react-i18next');
const { default: i18n } = await import('../src/i18n');
const { SectionNetwork } =
  await import('../src/features/config/components/sections/SectionNetwork');

describe('visual config routing strategy', () => {
  test('recognizes the weighted-round-robin backend value', () => {
    expect(parseRoutingStrategy('weighted-round-robin')).toBe('weighted-round-robin');
    expect(parseRoutingStrategy('weightedroundrobin')).toBe('weighted-round-robin');
    expect(parseRoutingStrategy('wrr')).toBe('weighted-round-robin');
    expect(parseRoutingStrategy('fill-first')).toBe('fill-first');
    expect(parseRoutingStrategy('fillfirst')).toBe('fill-first');
    expect(parseRoutingStrategy('ff')).toBe('fill-first');
    expect(parseRoutingStrategy(undefined)).toBe('round-robin');
  });

  test('recognizes the soonest-reset backend value and its aliases', () => {
    expect(parseRoutingStrategy('soonest-reset')).toBe('soonest-reset');
    expect(parseRoutingStrategy(' Soonest-Reset ')).toBe('soonest-reset');
    expect(parseRoutingStrategy('soonestreset')).toBe('soonest-reset');
    expect(parseRoutingStrategy('reset-first')).toBe('soonest-reset');
    expect(parseRoutingStrategy('resetfirst')).toBe('soonest-reset');
  });

  function renderStrategyWrite(strategy: RoutingStrategy): string {
    function Harness() {
      const visualConfig = useVisualConfig();
      const [phase, setPhase] = useState(0);

      if (phase === 0) {
        visualConfig.setVisualValues({ routingStrategy: strategy });
        setPhase(1);
      } else {
        return createElement(
          'pre',
          null,
          visualConfig.applyVisualChangesToYaml('routing:\n  strategy: round-robin\n')
        );
      }

      return null;
    }

    const markup = renderToStaticMarkup(createElement(Harness));
    return markup.slice('<pre>'.length, -'</pre>'.length);
  }

  test('writes weighted-round-robin without coercing it to round-robin', () => {
    expect(parseYaml(renderStrategyWrite('weighted-round-robin'))).toEqual({
      routing: { strategy: 'weighted-round-robin' },
    });
  });

  test('writes soonest-reset without coercing it to round-robin', () => {
    expect(parseYaml(renderStrategyWrite('soonest-reset'))).toEqual({
      routing: { strategy: 'soonest-reset' },
    });
  });

  test('offers soonest-reset in the network section strategy select', () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n: i18n.cloneInstance({ lng: 'en' }) },
        createElement(SectionNetwork as ComponentType<Record<string, unknown>>, {
          values: { ...DEFAULT_VISUAL_VALUES, routingStrategy: 'soonest-reset' },
          disabled: false,
          onChange: () => {},
        })
      )
    );

    expect(markup).toContain('Soonest Reset');
    expect(markup).not.toContain('strategy_soonest_reset');
  });

  test.each(['en', 'zh-CN', 'zh-TW', 'ru', 'vi', 'ko'])('%s labels soonest-reset', async (lng) => {
    const locale = await Bun.file(`src/i18n/locales/${lng}.json`).json();
    expect(locale.basic_settings.routing_strategy_soonest_reset).toStartWith('soonest-reset');
    expect(locale.config_management.visual.sections.network.strategy_soonest_reset).toBeTruthy();
  });
});
