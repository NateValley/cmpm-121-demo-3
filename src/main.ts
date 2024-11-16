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

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Board Implementation
const board = new Board(TILE_DEGREES, 8);

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Origin variable that can be moved
const origin = OAKES_CLASSROOM;
// const originCell = board.getCellForPoint(origin);

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

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("don't forget. you are simply a pawn in this world.");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "Nothing yet...";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  i = (origin.lat + (i * TILE_DEGREES)) / TILE_DEGREES;
  j = (origin.lng + (j * TILE_DEGREES)) / TILE_DEGREES;

  const point = leaflet.latLng(i, j);
  const pointCell = board.getCellForPoint(point);
  const bounds = board.getCellBounds(pointCell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  let tempValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let coinValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

    if (tempValue != coinValue) {
      coinValue = tempValue;
    }

    for (let x = 0; x < coinValue; x++) {
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
                <div>There is a cache here at "${
      (i * TILE_DEGREES).toFixed(4)
    },${
      (j * TILE_DEGREES).toFixed(4)
    }". There are <span id="value">${coinValue}</span> of them.</div>
                <button id="grab">take one with you</button><button id="donate">leave one for later</button>`;

    // Clicking the button decrements the cache's value and increments the player's coins
    popupDiv
      .querySelector<HTMLButtonElement>("#grab")!
      .addEventListener("click", () => {
        if (coinValue > 0) {
          coinValue--;

          let isFound = false;

          for (let x = 0; x < CoinsArray.length; x++) {
            if (CoinsArray[x].i == i && CoinsArray[x].j == j && !isFound) {
              console.log(CoinsArray[x]);
              lastCoin = CoinsArray[x];
              PlayerCoins.push(CoinsArray[x]);
              CoinsArray.splice(x, 1);
              isFound = true;
            }
          }
        }

        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinValue
          .toString();
        statusPanel.innerHTML =
          `${PlayerCoins.length} deer-like skulls found. Last skull's coordinates: (${
            (lastCoin.i * TILE_DEGREES).toFixed(4)
          }, ${
            (lastCoin.j * TILE_DEGREES).toFixed(4)
          }); Marked as: ${lastCoin.serial}`;
        tempValue = coinValue;
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#donate")!
      .addEventListener("click", () => {
        if (PlayerCoins.length > 0) {
          coinValue++;

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

        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinValue
          .toString();
        statusPanel.innerHTML =
          `${PlayerCoins.length} deer-like found. Last skull's coordinates: (${
            (lastCoin.i * TILE_DEGREES).toFixed(4)
          }), ${
            (lastCoin.j * TILE_DEGREES).toFixed(4)
          }); Marked as: ${lastCoin.serial}`;
        tempValue = coinValue;
      });

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
