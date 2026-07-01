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

const sendPhoneJoin = (socket, payload) =>
  new Promise((resolve) => socket.emit('phone-mic-join', payload, resolve));

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

describe('phone mic contributor signaling', () => {
  test('joining a phone mic notifies the active sender to create an offer', async () => {
    const sender = connect();
    await new Promise((resolve) => sender.on('connect', resolve));
    await sendJoin(sender, { roomId: 'room-phone-1' });

    const offerRequest = new Promise((resolve) => sender.on('phone-mic-request-offer', resolve));

    const phone = connect();
    await new Promise((resolve) => phone.on('connect', resolve));
    const join = await sendPhoneJoin(phone, { roomId: 'room-phone-1', contributorId: 'phone-a', label: 'Balcony Mic' });

    expect(join.ok).toBe(true);
    expect(join.hostAvailable).toBe(true);
    await expect(offerRequest).resolves.toMatchObject({
      contributorId: 'phone-a',
      label: 'Balcony Mic',
    });

    sender.close();
    phone.close();
  });

  test('a sender joining later receives offer requests for waiting phone mics', async () => {
    const phone = connect();
    await new Promise((resolve) => phone.on('connect', resolve));
    const join = await sendPhoneJoin(phone, { roomId: 'room-phone-2', contributorId: 'phone-b' });
    expect(join.hostAvailable).toBe(false);

    const sender = connect();
    await new Promise((resolve) => sender.on('connect', resolve));
    const offerRequest = new Promise((resolve) => sender.on('phone-mic-request-offer', resolve));
    await sendJoin(sender, { roomId: 'room-phone-2' });

    await expect(offerRequest).resolves.toMatchObject({
      contributorId: 'phone-b',
      label: 'Room Mic',
    });

    sender.close();
    phone.close();
  });

  test('disconnecting a phone mic notifies the sender', async () => {
    const sender = connect();
    await new Promise((resolve) => sender.on('connect', resolve));
    await sendJoin(sender, { roomId: 'room-phone-3' });

    const phone = connect();
    await new Promise((resolve) => phone.on('connect', resolve));
    const join = await sendPhoneJoin(phone, { roomId: 'room-phone-3', contributorId: 'phone-c' });

    const left = new Promise((resolve) => sender.on('phone-mic-left', resolve));
    phone.close();

    await expect(left).resolves.toMatchObject({
      contributorId: join.contributorId,
    });

    sender.close();
  });
});
