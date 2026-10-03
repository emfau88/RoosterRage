// The README's public portal preview offers all three characters immediately.
// Availability is temporary: earned unlocks in the save retain their usual rules.
export function isPublicRoosterPreview(location = globalThis.location) {
  return location?.hostname === 'emfau88.github.io'
    && /^\/RoosterRage\/kongregate\/(?:index\.html)?$/.test(location.pathname);
}
