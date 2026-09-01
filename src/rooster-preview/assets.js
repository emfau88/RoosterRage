const artilleryUrls = import.meta.glob('../assets/characters/artillery-four-direction/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default'
});
const stormUrls = import.meta.glob('../assets/characters/storm-four-direction/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default'
});

function keyedUrls(modules) {
  return Object.fromEntries(Object.entries(modules).map(([path, url]) => {
    const match = path.match(/four-direction\/(south|west|east|north)\/([^/]+)\.webp$/);
    if (!match) throw new Error(`Unbekanntes Richtungsasset: ${path}`);
    return [`${match[1]}/${match[2]}`, url];
  }));
}

async function loadImages(urls) {
  const entries = await Promise.all(Object.entries(urls).map(async ([key, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [key, image];
  }));
  return Object.fromEntries(entries);
}

export async function loadRoosterParts() {
  const [artillery, storm] = await Promise.all([
    loadImages(keyedUrls(artilleryUrls)),
    loadImages(keyedUrls(stormUrls))
  ]);
  return { artillery, storm };
}
