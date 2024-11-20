// CSS Style File
import "./style.css";

// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Flyweight Factory File
import { Board } from "./board.ts";

// Cache/Momento File
import { Cache } from "./cache.ts";

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const PLAYER_VISION = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Board Implementation
const board = new Board(TILE_DEGREES, PLAYER_VISION);

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Coin Implementation
interface Coin {
  i: number;
  j: number;
  serial: number;
}

const CoinsArray: Coin[] = [];
const PlayerCoins: Coin[] = [];
let lastCoin: Coin;

const CacheArray: Cache[] = [];

// Hold updated information
const MomentoArray: string[] = [];

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(
  leaflet.latLng(36.98949379578401, -122.06277128548504),
);
playerMarker.bindTooltip("don't forget. you are simply a pawn in this world.");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "Nothing yet...";

// Access buttons from HTML
// ------------------------------

// Sensor Button
const sensorButton = document.querySelector<HTMLButtonElement>("#sensor");

// Directional Buttons
const northButton = document.querySelector<HTMLButtonElement>("#north");
const southButton = document.querySelector<HTMLButtonElement>("#south");
const westButton = document.querySelector<HTMLButtonElement>("#west");
const eastButton = document.querySelector<HTMLButtonElement>("#east");

// Reset Button
const resetButton = document.querySelector<HTMLButtonElement>("#reset");

// Button Functionality
// ------------------------------

// Sensor Button (Ask user for current location)
sensorButton!.addEventListener("click", () => {
});

// Directional Buttons (Move Player)
northButton!.addEventListener("click", () => {
  playerMove("north");
});

southButton!.addEventListener("click", () => {
  playerMove("south");
});

westButton!.addEventListener("click", () => {
  playerMove("west");
});

eastButton!.addEventListener("click", () => {
  playerMove("east");
});

// Reset Button
resetButton!.addEventListener("click", () => {
});

// Functions
// ------------------------------

// Spawn caches on map depending on cell
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const iCoord = i * TILE_DEGREES;
  const jCoord = j * TILE_DEGREES;

  const newCache = new Cache(i, j, 0);
  const point = leaflet.latLng(iCoord, jCoord);
  const pointCell = board.getCellForPoint(point);
  const bounds = board.getCellBounds(pointCell);

  // Each cache has a random point value, mutable by the player
  const coinValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  newCache.numCoins = coinValue;
  CacheArray.push(newCache);

  const momentoFound = MomentoArray.find((momento) => {
    const tempCache = new Cache(0, 0, 0);
    tempCache.fromMomento(momento);

    return tempCache.i == i && tempCache.j == j;
  });

  if (momentoFound) {
    newCache.fromMomento(momentoFound);
  }

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);

  rect.addTo(map);

  rect.bindPopup(() => {
    for (let x = 0; x < newCache.numCoins; x++) {
      const newCoin: Coin = {
        i: i,
        j: j,
        serial: x,
      };
      CoinsArray.push(newCoin);
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                  <div>There is a cache here at "${iCoord.toFixed(4)},${
      jCoord.toFixed(4)
    }". There are <span id="value">${newCache.numCoins}</span> of them.</div>
                  <button id="grab">take one with you</button><button id="donate">leave one for later</button>`;

    // Clicking the button decrements the cache's value and increments the player's coins
    popupDiv
      .querySelector<HTMLButtonElement>("#grab")!
      .addEventListener("click", () => {
        if (newCache.numCoins > 0) {
          newCache.numCoins--;

          let isFound = false;

          for (let x = 0; x < CoinsArray.length; x++) {
            if (CoinsArray[x].i == i && CoinsArray[x].j == j && !isFound) {
              lastCoin = CoinsArray[x];
              PlayerCoins.push(CoinsArray[x]);
              CoinsArray.splice(x, 1);
              isFound = true;
            }
          }
        }

        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = newCache
          .numCoins
          .toString();
        statusPanel.innerHTML =
          `${PlayerCoins.length} deer-like skulls found. Last skull's coordinates: (${
            (lastCoin.i * TILE_DEGREES).toFixed(4)
          }, ${
            (lastCoin.j * TILE_DEGREES).toFixed(4)
          }); Marked as: ${lastCoin.serial}`;
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#donate")!
      .addEventListener("click", () => {
        if (PlayerCoins.length > 0) {
          newCache.numCoins++;

          let hasDonated = false;

          for (let x = 0; x < PlayerCoins.length; x++) {
            if (!hasDonated) {
              lastCoin = PlayerCoins[x];
              CoinsArray.push(PlayerCoins[x]);
              PlayerCoins.splice(x, 1);
              hasDonated = true;
            }
          }
        }

        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = newCache
          .numCoins
          .toString();
        statusPanel.innerHTML =
          `${PlayerCoins.length} deer-like found. Last skull's coordinates: (${
            (lastCoin.i * TILE_DEGREES).toFixed(4)
          }), ${
            (lastCoin.j * TILE_DEGREES).toFixed(4)
          }); Marked as: ${lastCoin.serial}`;
      });

    return popupDiv;
  });
}

function playerMove(direction: string) {
  const tempPosition = playerMarker.getLatLng();
  switch (direction) {
    case "north":
      tempPosition.lat += TILE_DEGREES;
      break;
    case "south":
      tempPosition.lat -= TILE_DEGREES;
      break;
    case "west":
      tempPosition.lng -= TILE_DEGREES;
      break;
    case "east":
      tempPosition.lng += TILE_DEGREES;
      break;
  }

  clearCaches();
  playerMarker.setLatLng(tempPosition);
  generateCaches();
}

function clearCaches() {
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });

  const cells = board.getCellsNearPoint(playerMarker.getLatLng());

  cells.forEach((cell) => {
    CacheArray.forEach((cache) => {
      if (cell.i == cache.i && cell.j == cache.j) {
        const momentoExists = MomentoArray.some((momento) => {
          const tempCache = new Cache(0, 0, 0);
          tempCache.fromMomento(momento);

          return tempCache.i == cache.i && tempCache.j == cache.j;
        });

        if (momentoExists) {
          const foundIndex = MomentoArray.findIndex((momento) => {
            const tempCache = new Cache(0, 0, 0);
            tempCache.fromMomento(momento);

            return tempCache.i == cache.i && tempCache.j == cache.j;
          });

          MomentoArray[foundIndex] = cache.toMomento();
        } else {
          MomentoArray.push(cache.toMomento());
        }
      }
    });
  });
}

function generateCaches() {
  const cells = board.getCellsNearPoint(playerMarker.getLatLng());

  cells.forEach((cell) => {
    const cacheRandom =
      luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY;

    if (cacheRandom) {
      spawnCache(cell.i, cell.j);
    }
  });
}

generateCaches();
