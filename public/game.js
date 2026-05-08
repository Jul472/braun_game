window.Game = (() => {
  const listeners = {};
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.addEventListener('open', () => {
      emit('__connected');
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    });

    ws.addEventListener('close', () => {
      emit('__disconnected');
      ws = null;
      reconnectTimer = setTimeout(connect, 2500);
    });

    ws.addEventListener('error', () => ws.close());

    ws.addEventListener('message', e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      emit(msg.type, msg.payload);
    });
  }

  function emit(type, payload) {
    (listeners[type] || []).forEach(fn => {
      try { fn(payload); } catch (err) { console.error('Game listener error:', err); }
    });
  }

  function on(type, fn) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(fn);
  }

  function send(type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  connect();

  return { on, send };
})();
