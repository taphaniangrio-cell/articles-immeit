const bus = require('../../lib/events');

describe('events.js — EventEmitter bus', () => {

  it('is an EventEmitter', () => {
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.emit).toBe('function');
  });

  it('has maxListeners set to 100', () => {
    expect(bus.getMaxListeners()).toBe(100);
  });

  it('emits and receives events', () => {
    return new Promise((resolve) => {
      bus.once('test-event', (data) => {
        expect(data).toEqual({ items: 42 });
        resolve();
      });
      bus.emit('test-event', { items: 42 });
    });
  });

  it('supports multiple listeners', () => {
    let count = 0;
    const handler = () => { count++; };
    bus.on('multi-test', handler);
    bus.on('multi-test', handler);
    bus.emit('multi-test');
    bus.removeListener('multi-test', handler);
    bus.removeListener('multi-test', handler);
    expect(count).toBe(2);
  });
});
