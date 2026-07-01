const { io: ioClient } = require('socket.io-client');

let server;
let port;

beforeAll((done) => {
  ({ server } = require('./server'));
  server.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

const connect = () => ioClient(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });

const sendJoin = (socket, payload) =>
  new Promise((resolve) => socket.emit('sender-join', payload, resolve));

describe('sender-join hijack protection', () => {
  test('first sender to join a room gets ok:true and a token', async () => {
    const a = connect();
    await new Promise((resolve) => a.on('connect', resolve));
    const res = await sendJoin(a, { roomId: 'room-1' });
    expect(res.ok).toBe(true);
    expect(typeof res.token).toBe('string');
    a.close();
  });

  test('a second client cannot hijack a room that already has an active sender', async () => {
    const a = connect();
    await new Promise((resolve) => a.on('connect', resolve));
    await sendJoin(a, { roomId: 'room-2' });

    const b = connect();
    await new Promise((resolve) => b.on('connect', resolve));
    const res = await sendJoin(b, { roomId: 'room-2' }); // no token — different client

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('taken');

    a.close();
    b.close();
  });

  test('the original sender can reclaim the room using its stored token', async () => {
    const a = connect();
    await new Promise((resolve) => a.on('connect', resolve));
    const first = await sendJoin(a, { roomId: 'room-3' });

    // Simulate a reconnect: new socket, but presents the token from the first join
    const a2 = connect();
    await new Promise((resolve) => a2.on('connect', resolve));
    const second = await sendJoin(a2, { roomId: 'room-3', token: first.token });

    expect(second.ok).toBe(true);
    expect(second.token).toBe(first.token);

    a.close();
    a2.close();
  });

  test('a room becomes claimable again once the sender disconnects', async () => {
    const a = connect();
    await new Promise((resolve) => a.on('connect', resolve));
    await sendJoin(a, { roomId: 'room-4' });
    a.close();
    await new Promise((resolve) => setTimeout(resolve, 200)); // let the server process the disconnect

    const b = connect();
    await new Promise((resolve) => b.on('connect', resolve));
    const res = await sendJoin(b, { roomId: 'room-4' }); // no token — room should be free now
    expect(res.ok).toBe(true);
    b.close();
  });
});
