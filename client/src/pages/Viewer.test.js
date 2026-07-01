import { resolveRemoteStream, viewerShouldStartMuted } from './Viewer';

class FakeMediaStream {
  constructor(tracks = []) { this.tracks = [...tracks]; }
  getTracks() { return this.tracks; }
  addTrack(track) { this.tracks.push(track); }
}

test('uses the signalled stream when the remote track belongs to one', () => {
  const stream = new FakeMediaStream();
  expect(resolveRemoteStream({ streams: [stream], track: { id: 'v' } }, null, FakeMediaStream)).toBe(stream);
});

test('assembles streamless transceiver tracks into a persistent media stream', () => {
  const video = { id: 'video' }, audio = { id: 'audio' };
  const stream = resolveRemoteStream({ streams: [], track: video }, null, FakeMediaStream);
  expect(stream.getTracks()).toEqual([video]);
  expect(resolveRemoteStream({ streams: [], track: audio }, stream, FakeMediaStream)).toBe(stream);
  expect(stream.getTracks()).toEqual([video, audio]);
});

test('viewer audio is enabled by default and can be explicitly muted', () => {
  expect(viewerShouldStartMuted('')).toBe(false);
  expect(viewerShouldStartMuted('?muted=1')).toBe(true);
});
