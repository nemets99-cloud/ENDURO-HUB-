function distanceBetween(a, b) {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function calculateDistance(points) {
  return points.reduce((sum, point, index) =>
    index ? sum + distanceBetween(points[index - 1], point) : 0, 0);
}

function isValidRide(ride) {
  return Boolean(
    ride &&
    typeof ride.id === 'string' &&
    Array.isArray(ride.points) &&
    ride.points.every((point) =>
      Number.isFinite(point?.latitude) &&
      Number.isFinite(point?.longitude) &&
      Math.abs(point.latitude) <= 90 &&
      Math.abs(point.longitude) <= 180
    )
  );
}
module.exports = { distanceBetween, calculateDistance, isValidRide };
