import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistance, distanceBetween, isValidRide } from './rideUtils.js';

test('distanceBetween returns zero for the same point', () => {
  const point = { latitude: 47.2, longitude: 11.4 };
  assert.equal(distanceBetween(point, point), 0);
});

test('calculateDistance sums consecutive GPS segments', () => {
  const points = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0.01 },
    { latitude: 0, longitude: 0.02 },
  ];
  const distance = calculateDistance(points);
  assert.ok(distance > 2200 && distance < 2230);
});

test('isValidRide accepts a ride with valid GPS coordinates', () => {
  assert.equal(isValidRide({ id: '1', points: [{ latitude: 47, longitude: 11 }] }), true);
});

test('isValidRide rejects missing IDs and invalid coordinates', () => {
  assert.equal(isValidRide({ points: [] }), false);
  assert.equal(isValidRide({ id: '2', points: [{ latitude: 91, longitude: 11 }] }), false);
  assert.equal(isValidRide({ id: '3', points: [{ latitude: 47, longitude: NaN }] }), false);
});
